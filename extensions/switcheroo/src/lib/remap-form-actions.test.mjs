import assert from "node:assert/strict";
import { test } from "node:test";
import { createReloadRemapsAction } from "./remap-form-actions.mjs";

test("offering recovery preserves unsaved edits until the action is chosen", () => {
  const events = [];
  const action = createReloadRemapsAction(
    () => events.push("reload"),
    () => events.push("close"),
  );

  assert.equal(action.title, "Discard Edits and Reload");
  assert.deepEqual(events, []);
  action.onAction();
  assert.deepEqual(events, ["close", "reload"]);
});

test("recovery loads the latest list without reusing the obsolete selection", () => {
  let currentEntries = ["original"];
  let visibleEntries = currentEntries;
  let formOpen = true;
  const action = createReloadRemapsAction(
    () => {
      visibleEntries = currentEntries;
    },
    () => {
      formOpen = false;
    },
  );

  // The selected entry was removed externally while the form was open.
  currentEntries = [];
  action.onAction();

  assert.equal(formOpen, false);
  assert.deepEqual(visibleEntries, []);
});

test("recovery does not hide reload failures or reopen the stale form", () => {
  let formOpen = true;
  const failure = new Error("Config is unreadable");
  const action = createReloadRemapsAction(
    () => {
      throw failure;
    },
    () => {
      formOpen = false;
    },
  );

  assert.throws(
    () => action.onAction(),
    (error) => error === failure,
  );
  assert.equal(formOpen, false);
});
