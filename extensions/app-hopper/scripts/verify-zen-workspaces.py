"""macOS acceptance: temporary signed Zen copy, scratch profile and test tabs only."""
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import uuid

ROOT = Path(__file__).resolve().parent.parent
BRIDGE = Path.home() / "Library/Application Support/raycast-app-hopper-zen"


def run(*args):
    subprocess.run(args, check=True, cwd=ROOT)


def request(file, command):
    with socket.socket(socket.AF_UNIX) as connection:
        connection.settimeout(5)
        connection.connect(str(file))
        connection.sendall((json.dumps(command) + "\n").encode())
        data = b""
        while b"\n" not in data:
            chunk = connection.recv(65536)
            if not chunk:
                raise RuntimeError("Test companion disconnected")
            data += chunk
            if len(data) > 1024 * 1024:
                raise RuntimeError("Test response too large")
        result = json.loads(data)
        if "error" in result:
            raise RuntimeError(result["error"])
        return result["data"]


def snapshot(profile):
    prefs = profile / "prefs.js"
    if not prefs.exists():
        return None
    for line in prefs.read_text().splitlines():
        if line.startswith('user_pref("app-hopper.test.error", '):
            raise RuntimeError(line)
        if line.startswith('user_pref("app-hopper.test.snapshot", '):
            return json.loads(json.loads(line.split(", ", 1)[1][:-2]))
    return None


def wait_for(check, process, message):
    deadline = time.monotonic() + 40
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"Test Zen exited: {process.returncode}")
        value = check()
        if value:
            return value
        time.sleep(0.25)
    raise RuntimeError(message)


def main():
    if sys.platform != "darwin":
        raise RuntimeError("Requires macOS and installed Zen")
    if not BRIDGE.exists():
        raise RuntimeError("Prepare the local Zen helper before this test")
    run("npm", "run", "build:companion")
    run("npm", "run", "build:privileged")
    with tempfile.TemporaryDirectory(prefix="ah-zen-acceptance-", dir="/private/tmp") as directory:
        scratch = Path(directory)
        app = scratch / "Zen.app"
        run("/usr/bin/ditto", "--noqtn", "--noextattr", "/Applications/Zen.app", str(app))
        # Finder metadata can be regenerated when macOS copies an app directory.
        subprocess.run(["/usr/bin/xattr", "-dr", "com.apple.FinderInfo", str(app)], check=False)
        resources = app / "Contents/Resources"
        run("node", "--import", "tsx", "scripts/zen-workspace-bridge.ts", "install", "--resources", str(resources))
        token = uuid.uuid4().hex
        config = resources / "app-hopper-zen.cfg"
        with config.open("a") as output:
            output.write("\nconst APP_HOPPER_TEST_EXTENSION = " + json.dumps(str(ROOT / "dist/companion/extension")) + ";\n")
            output.write("const APP_HOPPER_TEST_TOKEN = " + json.dumps(token) + ";\n")
            output.write((ROOT / "dist/privileged/tests/fixtures/zen-workspace-smoke.js").read_text())
        entitlements = scratch / "entitlements.plist"
        entitlements.write_text('''<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict><key>com.apple.security.cs.allow-jit</key><true/>
<key>com.apple.security.cs.disable-library-validation</key><true/></dict></plist>''')
        # Development-sign only this disposable copy; never change the installed app.
        run("/usr/bin/codesign", "--force", "--deep", "--sign", "-", "--options", "runtime", "--requirements",
            '=designated => identifier "app.zen-browser.zen"', "--entitlements", str(entitlements), str(app))
        profile = scratch / "profile"
        profile.mkdir()
        before = set(BRIDGE.glob("*.sock"))
        with (scratch / "launch.log").open("w") as log:
            process = subprocess.Popen([str(app / "Contents/MacOS/zen"), "-no-remote", "-headless", "-profile",
                                        str(profile), "-offline", "about:blank"], stdout=log, stderr=log)
            try:
                initial = wait_for(lambda: snapshot(profile), process, "No startup snapshot")
                assert initial["workspace"] == initial["firstWorkspace"]
                assert initial["firstWorkspace"] != initial["secondWorkspace"]
                connection = wait_for(lambda: next(iter(set(BRIDGE.glob("*.sock")) - before), None),
                                      process, "Companion did not connect")
                first = "about:blank#app-hopper-" + token + "-first"
                second = "about:blank#app-hopper-" + token + "-second"
                def list_test_tabs():
                    windows = request(connection, {"command": "list"})
                    tabs = [(window["id"], tab) for window in windows for tab in window["tabs"]]
                    return tabs if any(tab["url"] == second for _, tab in tabs) else None
                tabs = wait_for(list_test_tabs, process, "Inactive workspace tab missing")
                for url, workspace in [(second, initial["secondWorkspace"]), (first, initial["firstWorkspace"])]:
                    window_id, tab = next((wid, tab) for wid, tab in tabs if tab["url"] == url)
                    assert request(connection, {"command": "focus", "windowId": window_id, "tabId": tab["id"]}) is True
                    def selected():
                        state = snapshot(profile)
                        return state and state["selected"] == url and state["workspace"] == workspace
                    wait_for(selected, process, "Cross-workspace focus failed")
                print("PASS: startup, delayed companion, all-workspace listing, focus in both directions")
            finally:
                if process.poll() is None:
                    process.terminate()
                    try:
                        process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait()


if __name__ == "__main__":
    main()
