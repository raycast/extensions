// The history against an in-memory LocalStorage, in place of Raycast's.
import assert from "node:assert/strict";
import Module from "node:module";
import { test } from "node:test";

const stored = new Map<string, string>();
const fakeApi = {
  LocalStorage: {
    getItem: async (key: string) => stored.get(key),
    setItem: async (key: string, value: string) => void stored.set(key, value),
    removeItem: async (key: string) => void stored.delete(key),
  },
};
const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function (
  request: unknown,
  ...rest: unknown[]
) {
  return request === "@raycast/api" ? fakeApi : originalLoad.call(this, request, ...rest);
};

test("pages come back newest first, once each, and can be removed or cleared", async () => {
  const { clearHistory, forgetPage, recentPages, rememberPage } = await import("../src/history");
  await rememberPage({ path: "nodes/sop/box", title: "Box" });
  await rememberPage({ path: "nodes/sop/scatter", title: "Scatter" });
  await rememberPage({ path: "nodes/sop/box", title: "Box" });
  assert.deepEqual(
    (await recentPages()).map((page) => page.path),
    ["nodes/sop/box", "nodes/sop/scatter"],
  );
  await forgetPage("nodes/sop/box");
  assert.deepEqual(
    (await recentPages()).map((page) => page.path),
    ["nodes/sop/scatter"],
  );
  for (let i = 0; i < 25; i++) await rememberPage({ path: `page/${i}`, title: `Page ${i}` });
  assert.equal((await recentPages()).length, 20);
  await clearHistory();
  assert.deepEqual(await recentPages(), []);
});
