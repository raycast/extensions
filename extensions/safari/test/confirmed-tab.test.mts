// Run with: node --test test/confirmed-tab.test.mts
import assert from "node:assert/strict";
import { test } from "node:test";
import { closeTarget, CONFIRMED_TAB_MAX_AGE_MS, NO_CONFIRMATION_ERROR, takeConfirmed } from "../src/confirmed-tab.ts";

const tab = { windowRef: 1737, windowId: 1, index: 4, title: "Sans titre", url: "" };
const now = 1_000_000;
const store = (value: object) => JSON.stringify(value);

test("closes the confirmed tab for the same target", () => {
  const stored = store({ target: closeTarget({ windowId: 1, index: 4 }), tab, confirmedAt: now - 1000 });
  assert.deepEqual(takeConfirmed(stored, closeTarget({ windowId: 1, index: 4 }), now), { tab });
});

test("closes the confirmed current tab even if another tab is focused now", () => {
  const stored = store({ target: closeTarget(), tab, confirmedAt: now - 1000 });
  assert.deepEqual(takeConfirmed(stored, closeTarget(), now), { tab });
});

test("refuses without a confirmation", () => {
  assert.deepEqual(takeConfirmed(undefined, closeTarget(), now), { error: NO_CONFIRMATION_ERROR });
});

test("refuses an expired confirmation", () => {
  const stored = store({ target: closeTarget(), tab, confirmedAt: now - CONFIRMED_TAB_MAX_AGE_MS });
  assert.deepEqual(takeConfirmed(stored, closeTarget(), now), { error: NO_CONFIRMATION_ERROR });
});

test("refuses a confirmation from the future", () => {
  const stored = store({ target: closeTarget(), tab, confirmedAt: now + 1000 });
  assert.deepEqual(takeConfirmed(stored, closeTarget(), now), { error: NO_CONFIRMATION_ERROR });
});

test("refuses a confirmation given for another target", () => {
  const stored = store({ target: closeTarget({ windowId: 1, index: 2 }), tab, confirmedAt: now - 1000 });
  assert.deepEqual(takeConfirmed(stored, closeTarget({ windowId: 1, index: 4 }), now), {
    error: NO_CONFIRMATION_ERROR,
  });
  assert.deepEqual(takeConfirmed(stored, closeTarget(), now), { error: NO_CONFIRMATION_ERROR });
});

test("refuses an unreadable confirmation", () => {
  assert.deepEqual(takeConfirmed("not json", closeTarget(), now), { error: NO_CONFIRMATION_ERROR });
});

test("reports why the confirmation could not show a tab", () => {
  const error = "Safari window 1 has no tab 9 (3 open). Use get-all-tabs to list the open tabs.";
  const stored = store({ target: closeTarget({ windowId: 1, index: 9 }), error, confirmedAt: now - 1000 });
  assert.deepEqual(takeConfirmed(stored, closeTarget({ windowId: 1, index: 9 }), now), { error });
});
