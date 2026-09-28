import json
import os
from pathlib import Path
import subprocess

helper = Path(__file__).resolve().parents[1] / "assets/input-lock"
result = subprocess.run([helper, "--self-test"], capture_output=True, check=True)
assert json.loads(result.stdout)["reason"] == "selfTest"

reader, writer = os.pipe()
os.close(reader)
process = subprocess.Popen([helper, "--self-test"], stdout=writer, stderr=subprocess.PIPE)
os.close(writer)
_, error = process.communicate(timeout=5)
assert process.returncode == 1, (process.returncode, error)
assert b"failed to write helper status" in error, error
print("native check passed: Command timing, closed output pipe")
