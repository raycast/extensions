#!/usr/bin/env python3
"""Acceptance checks for the existing Raycast Swift helper, without mocks.

Default checks never lock input. --live runs one-second locks in each mode plus
parent-exit cleanup. Run it only in an explicitly agreed short test window.
"""
import argparse
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--helper", type=Path, default=ROOT / "assets/compiled_raycast_swift/MyExecutable")
parser.add_argument("--live", action="store_true")
args = parser.parse_args()
helper = args.helper.resolve()
if not helper.is_file():
    parser.error("Build the macOS extension first")
helper.chmod(helper.stat().st_mode | 0o100)


def run(duration, lock_mouse, timeout=8):
    return subprocess.run([str(helper), "handler", json.dumps(duration), json.dumps(lock_mouse)],
                          capture_output=True, timeout=timeout)


for duration in [-1, 0, 2_147_483_648]:
    result = run(duration, False)
    assert result.returncode == 1, (duration, result)
    assert result.stdout == b"", (duration, result.stdout)
    assert b"Error Domain=CleanKeyboard Code=1" in result.stderr, result.stderr
    assert b"Choose a positive duration, or Forever." in result.stderr, result.stderr
print("PASS: invalid durations fail before acquiring an input tap")

result = run(1, "not-a-boolean")
assert result.returncode == 1, result
assert result.stdout == b"", result.stdout
assert b'DecodingArgumentError<Optional<Bool>' in result.stderr, result.stderr
assert b'name: "lockMouse"' in result.stderr, result.stderr
assert b'position: 1' in result.stderr, result.stderr
assert b'Expected to decode Bool but found a string instead.' in result.stderr, result.stderr
print("PASS: invalid native arguments fail before acquiring an input tap")

if not args.live:
    print("Live input, browser behavior, and Touch ID were not exercised")
    raise SystemExit(0)

for lock_mouse in [False, True]:
    started = time.monotonic()
    result = run(1, lock_mouse)
    assert result.returncode == 0, (lock_mouse, result.stdout, result.stderr)
    assert json.loads(result.stdout) == "timeout", result.stdout
    assert time.monotonic() - started >= 0.8, "timer returned before the requested duration"
    print(f"PASS: real one-second timed release, lockMouse={lock_mouse}")

# This is a real launcher process that exits while the native lock is active.
launcher = """
import json, subprocess, sys, time
subprocess.Popen([sys.argv[1], 'handler', '1', 'true'], stdout=sys.stdout, stderr=sys.stderr)
time.sleep(0.4)
"""
process = subprocess.Popen([sys.executable, "-c", launcher, str(helper)],
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE, start_new_session=True)
try:
    output, error = process.communicate(timeout=8)
except subprocess.TimeoutExpired:
    os.killpg(process.pid, signal.SIGKILL)
    process.communicate(timeout=3)
    raise
assert process.returncode == 0, (output, error)
assert json.loads(output) == "watchdog", (output, error)
print("PASS: existing native helper releases input when its real launcher exits")
print("Browser typing/click/scroll, Touch ID cancellation/success, and recovery hold require physical acceptance")
