import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import tempfile
import time

root = Path(__file__).resolve().parents[1]
helper = root / ".build/input-lock-check"
helper.parent.mkdir(exist_ok=True)
env = dict(os.environ, DEVELOPER_DIR="/Library/Developer/CommandLineTools")
subprocess.run(["swiftc", "-D", "GUARDIAN_TESTING", *map(str, [root / "native/InputLock.swift", root / "native/Guardian.swift", root / "native/main.swift"]), "-o", helper], env=env, check=True, timeout=60)


def packets(output):
    return [json.loads(line) for line in output.splitlines() if line]


def gone(error):
    pid = int(re.search(rb"test-worker-pid:(\d+)", error)[1])
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return
    raise AssertionError(f"worker {pid} remains after guardian exit")


def run(mode, duration="indefinite"):
    started = time.monotonic()
    result = subprocess.run([helper, "--guardian-test", mode, duration], capture_output=True, timeout=9)
    gone(result.stderr)
    records = packets(result.stdout)
    assert all("kind" not in record for record in records), records
    return result.returncode, records, time.monotonic() - started


result = subprocess.run([helper, "--self-test"], capture_output=True, check=True, timeout=5)
assert packets(result.stdout)[-1]["reason"] == "selfTest"
for arguments in [["--lock"], ["--lock", "1"], ["--worker", str(os.getpid())]]:
    result = subprocess.run([helper, *arguments], capture_output=True, timeout=5)
    assert result.returncode == 2 and not result.stdout, result

process = subprocess.Popen([helper, "--worker", str(os.getpid())], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
output, error = process.communicate(input=b'{"command":"activate"}\n', timeout=3)
assert process.returncode == 2 and not output, (process.returncode, output, error)

code, records, elapsed = run("normal")
assert code == 0 and records[-1]["reason"] == "touchID", records
code, records, elapsed = run("startupFailure")
assert code == 1 and records[-1]["phase"] == "error", records
code, records, elapsed = run("delayed", "timed")
assert code == 0 and records[-1]["reason"] == "timeout" and elapsed >= 0.6, (records, elapsed)
code, records, elapsed = run("frozenProduction")
assert code == 0 and records[-1]["reason"] == "watchdog" and 6 <= elapsed < 8, (records, elapsed)

process = subprocess.Popen([helper, "--guardian-test", "healthy", "indefinite"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
assert json.loads(process.stdout.readline())["phase"] == "locked"
process.stdout.close()
process.stdout = None
_, error = process.communicate(timeout=3)
gone(error)
assert process.returncode == 1, (process.returncode, error)

for full in [False, True]:
    reader, writer = os.pipe()
    if full:
        os.set_blocking(writer, False)
        try:
            while True:
                os.write(writer, b"x" * 4096)
        except BlockingIOError:
            pass
    else:
        os.close(reader)
    process = subprocess.Popen([helper, "--guardian-test", "frozen", "indefinite"], stdout=writer, stderr=subprocess.PIPE)
    os.close(writer)
    _, error = process.communicate(timeout=3)
    if full:
        os.close(reader)
    gone(error)
    assert process.returncode == 1, (process.returncode, error)

with tempfile.TemporaryDirectory() as directory:
    log = Path(directory) / "status"
    errors = Path(directory) / "errors"
    wrapper = '''import pathlib, subprocess, sys
log = open(sys.argv[2], "w")
errors = open(sys.argv[3], "w")
p = subprocess.Popen([sys.argv[1], "--guardian-test", "frozen", "indefinite"], stdout=subprocess.PIPE, stderr=errors)
print(p.pid, flush=True)
for line in p.stdout:
    log.write(line.decode()); log.flush()
    if '"locked"' in line.decode(): break
# Keep the status pipe open in another process while this parent exits.
subprocess.Popen([sys.executable, "-c", "import time; time.sleep(2)"], stdin=p.stdout, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
'''
    parent = subprocess.run([sys.executable, "-c", wrapper, str(helper), str(log), str(errors)], capture_output=True, timeout=3)
    assert parent.returncode == 0, parent.stderr
    guardian = int(parent.stdout)
    deadline = time.monotonic() + 2
    while time.monotonic() < deadline:
        try:
            os.kill(guardian, 0)
        except ProcessLookupError:
            break
        time.sleep(0.05)
    else:
        raise AssertionError("guardian did not exit after its parent")
    gone(errors.read_bytes())

for supervisor_signal, mode in [(signal.SIGTERM, "frozen"), (signal.SIGKILL, "healthy")]:
    process = subprocess.Popen([helper, "--guardian-test", mode, "indefinite"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    locked = json.loads(process.stdout.readline())
    assert locked["phase"] == "locked", locked
    process.send_signal(supervisor_signal)
    output, error = process.communicate(timeout=3)
    gone(error)
    if supervisor_signal == signal.SIGTERM:
        assert process.returncode == 0 and packets(output)[-1]["reason"] == "watchdog", (output, error)
    else:
        assert process.returncode == -signal.SIGKILL, process.returncode

reader, writer = os.pipe()
os.close(reader)
process = subprocess.Popen([helper, "--self-test"], stdout=writer, stderr=subprocess.PIPE)
os.close(writer)
_, error = process.communicate(timeout=5)
assert process.returncode == 1 and b"failed to write helper status" in error, (process.returncode, error)
print("native check passed: duration validation, Command timing, normal/startup exit, activation timeout, frozen-worker watchdog, parent loss, guardian signals/loss, late/broken/full output, worker parent binding")
