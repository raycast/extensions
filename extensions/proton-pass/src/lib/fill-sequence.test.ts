import test from "node:test";
import assert from "node:assert/strict";
import { ClipboardSnapshot, FAILURE_HUD, FillDriver, PERMISSION_HUD, runFill } from "./fill-sequence";
import { KeyCode } from "./key-press";

const PREVIOUS: ClipboardSnapshot = { text: "previous clipboard" };

/** Records what the fill sequence does, optionally failing on a given key press. */
function fakeDriver(failOnKey?: { keyCode: number; error: Error }) {
  const calls: string[] = [];
  const driver: FillDriver = {
    readClipboard: async () => {
      calls.push("read clipboard");
      return PREVIOUS;
    },
    restoreClipboard: async (snapshot) => {
      calls.push(`restore ${snapshot.text}`);
    },
    copyConcealed: async (value) => {
      calls.push(`copy ${value}`);
    },
    pressKey: async (keyCode, modifiers = []) => {
      if (failOnKey?.keyCode === keyCode) throw failOnKey.error;
      calls.push(`key ${[...modifiers, keyCode].join("+")}`);
    },
    returnToPreviousApp: async () => {
      calls.push("return to app");
    },
    wait: async (ms) => {
      calls.push(`wait ${ms}`);
    },
    showHud: async (message) => {
      calls.push(`hud ${message}`);
    },
    finish: async () => {
      calls.push("finish");
    },
  };
  return { driver, calls };
}

test("pastes each value, with Tab in between, then leaves the 2FA code in the clipboard", async () => {
  const { driver, calls } = fakeDriver();
  await runFill(driver, {
    values: ["alice@example.com", "secret"],
    getClipboardValue: async () => "123456",
    clipboardValueHud: "2FA code copied",
  });

  assert.deepEqual(calls, [
    "read clipboard",
    "return to app",
    "copy alice@example.com",
    `key command+${KeyCode.V}`,
    "wait 300",
    `key ${KeyCode.Tab}`,
    "copy secret",
    `key command+${KeyCode.V}`,
    "wait 300",
    "copy 123456",
    "hud 2FA code copied",
    "finish",
  ]);
});

test("restores the previous clipboard when there's nothing to leave in it", async () => {
  const { driver, calls } = fakeDriver();
  await runFill(driver, { values: ["secret"], getClipboardValue: async () => Promise.reject(new Error("no code")) });

  assert.deepEqual(calls.slice(-2), ["restore previous clipboard", "finish"]);
});

test("presses Return after the last value when submitting", async () => {
  const { driver, calls } = fakeDriver();
  await runFill(driver, { values: ["alice", "secret"], submit: true });

  assert.deepEqual(calls.slice(-4), ["wait 300", `key ${KeyCode.Return}`, "restore previous clipboard", "finish"]);
});

test("restores the clipboard and explains missing permissions when a key press fails", async () => {
  const denied = fakeDriver({
    keyCode: KeyCode.V,
    error: new Error("System Events got an error: osascript is not allowed to send keystrokes. (1002)"),
  });
  await runFill(denied.driver, { values: ["secret"] });
  assert.deepEqual(denied.calls.slice(-3), ["restore previous clipboard", `hud ${PERMISSION_HUD}`, "finish"]);

  const failed = fakeDriver({ keyCode: KeyCode.Tab, error: new Error("something else") });
  await runFill(failed.driver, { values: ["alice", "secret"] });
  assert.deepEqual(failed.calls.slice(-3), ["restore previous clipboard", `hud ${FAILURE_HUD}`, "finish"]);
});
