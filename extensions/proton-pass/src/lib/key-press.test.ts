import test from "node:test";
import assert from "node:assert/strict";
import { isPermissionError, KeyCode, keyPressScript } from "./key-press";

test("builds System Events key presses from key codes", () => {
  assert.equal(keyPressScript(KeyCode.Tab), 'tell application "System Events" to key code 48');
  assert.equal(
    keyPressScript(KeyCode.V, ["command"]),
    'tell application "System Events" to key code 9 using {command down}',
  );
  assert.equal(
    keyPressScript(KeyCode.Return, ["command", "shift"]),
    'tell application "System Events" to key code 36 using {command down, shift down}',
  );
});

test("recognizes missing Accessibility or Automation permissions", () => {
  assert.equal(
    isPermissionError("System Events got an error: osascript is not allowed to send keystrokes. (1002)"),
    true,
  );
  assert.equal(isPermissionError("Not authorized to send Apple events to System Events. (-1743)"), true);
  assert.equal(isPermissionError("System Events got an error: Can’t get process 1. (-1728)"), false);
});
