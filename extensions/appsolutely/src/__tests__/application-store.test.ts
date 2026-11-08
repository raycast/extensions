import assert from "node:assert/strict";
import { test } from "node:test";
import { createApplicationStore } from "../services/application-store.ts";

const editor = { name: "Editor", path: "/Applications/Editor.app" };
const browser = { name: "Browser", path: "/Applications/Browser.app" };

test("one discovery publishes the complete catalog without waiting for custom icon loading", async () => {
  let finish!: (apps: (typeof editor)[]) => void;
  let discoveries = 0;
  const store = createApplicationStore({
    discover: () => {
      discoveries++;
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
  });
  const refresh = store.refresh();
  assert.equal(store.refresh(), refresh);
  assert.equal(discoveries, 1);
  assert.equal(store.getSnapshot().isLoading, true);
  finish([editor, browser]);
  await refresh;
  assert.equal(store.getSnapshot().isLoading, false);
  assert.deepEqual(
    store.getSnapshot().applications.map((app) => app.name),
    ["Browser", "Editor"],
  );
});

test("refresh keeps the current catalog visible until renamed, installed, and removed apps are discovered", async () => {
  let apps = [editor];
  const store = createApplicationStore({ discover: async () => apps });
  await store.refresh();
  apps = [{ ...editor, name: "Renamed Editor" }, browser];
  const refresh = store.refresh();
  assert.equal(store.getSnapshot().applications[0].name, "Editor");
  await refresh;
  assert.deepEqual(
    store.getSnapshot().applications.map((app) => app.name),
    ["Browser", "Renamed Editor"],
  );
  apps = [browser];
  await store.refresh();
  assert.deepEqual(
    store.getSnapshot().applications.map((app) => app.path),
    [browser.path],
  );
});

test("discovery errors retain the previous catalog and allow retry", async () => {
  let fail = false;
  const store = createApplicationStore({
    discover: async () => {
      if (fail) throw new Error("Discovery failed");
      return [editor];
    },
  });
  await store.refresh();
  fail = true;
  await store.refresh();
  assert.equal(store.getSnapshot().error?.message, "Discovery failed");
  assert.equal(store.getSnapshot().isLoading, false);
  assert.equal(store.getSnapshot().applications[0].path, editor.path);
  fail = false;
  await store.refresh();
  assert.equal(store.getSnapshot().error, undefined);
});
