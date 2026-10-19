#!/usr/bin/env python3
"""Acceptance checks against the built native executable; no mocks or test builds.

Default checks never lock input. --live temporarily blocks input on this Mac and
requires the existing Accessibility/Input Monitoring grants and enrolled Touch ID.
"""
import argparse
import json
import os
from pathlib import Path
import selectors
import signal
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--helper", type=Path, default=ROOT / "assets/compiled_raycast_swift/MyExecutable")
parser.add_argument("--live", action="store_true", help="run real 30-second locks and recovery checks")
args = parser.parse_args()
helper = args.helper.resolve()
if not helper.is_file():
    parser.error("Build the macOS extension before running acceptance checks")
helper.chmod(helper.stat().st_mode | 0o100)


def records(raw):
    return [json.loads(line) for line in raw.splitlines() if line.strip()]


def run(command, value):
    return subprocess.run([str(helper), command, json.dumps(value)], capture_output=True, timeout=10)


for token in ["", "0", "-1", "31", "Infinity", "not-a-duration"]:
    result = run("lockInputs", token)
    assert result.returncode == 2 and not result.stdout, (token, result)
print("PASS: unsupported durations fail before acquiring an input tap")

result = run("lockInputsWorker", os.getpid())
assert result.returncode == 2 and not result.stdout, result
print("PASS: direct worker invocation from another executable is refused")

if not args.live:
    print("Live locking, Touch ID, and browser behavior were not exercised; rerun with --live")
    raise SystemExit(0)


def start():
    return subprocess.Popen([str(helper), "lockInputs", json.dumps("30")],
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE, bufsize=0)


def await_locked(process):
    selector = selectors.DefaultSelector()
    selector.register(process.stdout, selectors.EVENT_READ)
    deadline = time.monotonic() + 35
    received = []
    try:
        while time.monotonic() < deadline:
            if not selector.select(1):
                continue
            line = process.stdout.readline()
            if not line:
                raise AssertionError(("helper exited before locking", received, process.stderr.read()))
            packet = json.loads(line)
            received.append(packet)
            if packet.get("phase") == "error":
                raise AssertionError(("native prerequisite failed", packet))
            if packet.get("phase") == "locked":
                return received
        raise AssertionError(("lock startup timed out", received))
    finally:
        selector.close()


def finish(process, expected, timeout):
    output, error = process.communicate(timeout=timeout)
    packets = records(output)
    assert process.returncode == 0, (process.returncode, packets, error)
    assert packets and packets[-1].get("phase") == "ready", packets
    assert packets[-1].get("reason") == expected, packets
    return packets


def cleanup(process):
    if process.poll() is None:
        process.terminate()
        try:
            process.communicate(timeout=8)
        except subprocess.TimeoutExpired:
            process.kill()
            process.communicate(timeout=8)


process = start()
try:
    await_locked(process)
    duplicate = run("lockInputs", "30")
    assert duplicate.returncode == 1, duplicate
    assert any(p.get("reason") == "alreadyActive" for p in records(duplicate.stdout)), duplicate
    print("PASS: a second instance is rejected without disturbing the active lock")
    finish(process, "timeout", 35)
    print("PASS: the actual 30-second lock releases with a final timeout status")
finally:
    cleanup(process)

process = start()
try:
    await_locked(process)
    children = subprocess.check_output(["pgrep", "-P", str(process.pid)], text=True).split()
    assert len(children) == 1, children
    worker = int(children[0])
    os.kill(worker, signal.SIGSTOP)
    finish(process, "watchdog", 9)
    try:
        os.kill(worker, 0)
    except ProcessLookupError:
        pass
    else:
        raise AssertionError("guardian left its frozen input worker alive")
    print("PASS: a frozen real input worker is killed and reaped by the watchdog")
finally:
    cleanup(process)

process = start()
try:
    await_locked(process)
    process.terminate()
    finish(process, "watchdog", 8)
    print("PASS: terminating the supervisor releases its actual input worker")
finally:
    cleanup(process)

process = start()
try:
    await_locked(process)
    worker = int(subprocess.check_output(["pgrep", "-P", str(process.pid)], text=True).strip())
    os.kill(worker, signal.SIGKILL)
    output, error = process.communicate(timeout=8)
    terminal = records(output)[-1]
    assert (process.returncode, terminal.get("phase"), terminal.get("reason")) in [
        (1, "error", "workerExited"),
        (0, "ready", "watchdog"),
    ], (process.returncode, terminal, error)
    print("PASS: an unexpected worker crash reports failure or completed watchdog recovery")
finally:
    cleanup(process)

process = start()
try:
    await_locked(process)
    worker = int(subprocess.check_output(["pgrep", "-P", str(process.pid)], text=True).strip())
    process.stdout.close()
    process.stdout = None
    process.communicate(timeout=8)
    assert process.returncode == 1, process.returncode
    try:
        os.kill(worker, 0)
    except ProcessLookupError:
        pass
    else:
        raise AssertionError("disconnecting the output consumer left its input worker alive")
    print("PASS: losing the status consumer releases and reaps the input worker")
finally:
    cleanup(process)

started = time.monotonic()
legacy = run("handler", 1)
assert legacy.returncode == 0 and time.monotonic() - started >= 0.7, legacy
print("PASS: the original keyboard-only helper still completes its real timed lock")

print("Touch ID success/cancellation, recovery hold, and input/scroll behavior still require browser acceptance")
