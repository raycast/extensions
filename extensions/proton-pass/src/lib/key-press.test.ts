import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isBundleId, isPermissionError, KeyCode, keyPressScript, NOT_FRONTMOST_ERROR } from "./key-press";

test("presses keys only while the expected app is in front", () => {
  const guard = [
    "  set frontmostBundleId to bundle identifier of first application process whose frontmost is true",
    `  if frontmostBundleId is not "com.example.app" then error "${NOT_FRONTMOST_ERROR}"`,
  ];

  assert.equal(
    keyPressScript(KeyCode.Tab, [], "com.example.app"),
    ['tell application "System Events"', ...guard, "  key code 48", "end tell"].join("\n"),
  );
  assert.equal(
    keyPressScript(KeyCode.V, ["command"], "com.example.app"),
    ['tell application "System Events"', ...guard, "  key code 9 using {command down}", "end tell"].join("\n"),
  );
  assert.match(
    keyPressScript(KeyCode.Return, ["command", "shift"], "com.example.app"),
    /key code 36 using \{command down, shift down\}/,
  );
});

test("only accepts bundle identifiers that can't break out of the script", () => {
  assert.equal(isBundleId("com.example.my-app2"), true);
  assert.equal(isBundleId(undefined), false);
  assert.equal(isBundleId(""), false);
  assert.equal(isBundleId('com.example" then beep'), false);
  assert.throws(() => keyPressScript(KeyCode.V, ["command"], 'x" & "y'), /Invalid bundle identifier/);
});

test("recognizes missing Accessibility or Automation permissions", () => {
  assert.equal(
    isPermissionError("System Events got an error: osascript is not allowed to send keystrokes. (1002)"),
    true,
  );
  assert.equal(isPermissionError("Not authorized to send Apple events to System Events. (-1743)"), true);
  assert.equal(isPermissionError("System Events got an error: Can’t get process 1. (-1728)"), false);
  assert.equal(isPermissionError(`execution error: ${NOT_FRONTMOST_ERROR} (-2700)`), false);
});

test("AppleScript reads the key press script as written", { skip: process.platform !== "darwin" }, () => {
  const script = keyPressScript(KeyCode.V, ["command"], "com.example.app");
  const dir = mkdtempSync(join(tmpdir(), "key-press-"));
  writeFileSync(join(dir, "script.applescript"), script);
  execFileSync("osacompile", ["-o", join(dir, "script.scpt"), join(dir, "script.applescript")]);
  // Decompiling shows how AppleScript grouped each expression, e.g. a comparison taken into a `whose` filter.
  const decompiled = execFileSync("osadecompile", [join(dir, "script.scpt")], { encoding: "utf8" });
  const lines = (text: string) =>
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  assert.deepEqual(lines(decompiled), lines(script));
});
