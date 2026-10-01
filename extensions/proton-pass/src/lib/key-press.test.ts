import test from "node:test";
import assert from "node:assert/strict";
import { isBundleId, isPermissionError, KeyCode, keyPressScript, NOT_FRONTMOST_ERROR } from "./key-press";

test("presses keys only while the expected app is in front", () => {
  const guard = `  if bundle identifier of first application process whose frontmost is true is not "com.example.app" then error "${NOT_FRONTMOST_ERROR}"`;

  assert.equal(
    keyPressScript(KeyCode.Tab, [], "com.example.app"),
    ['tell application "System Events"', guard, "  key code 48", "end tell"].join("\n"),
  );
  assert.equal(
    keyPressScript(KeyCode.V, ["command"], "com.example.app"),
    ['tell application "System Events"', guard, "  key code 9 using {command down}", "end tell"].join("\n"),
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
