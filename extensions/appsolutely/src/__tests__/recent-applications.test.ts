import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareApplications } from "../services/application-model.ts";
import { RecentApplications, RECENT_APPLICATIONS_KEY, recentApplications } from "../services/recent-applications.ts";

function memoryStorage(initial?: string) {
  const values = new Map<string, string>(initial ? [[RECENT_APPLICATIONS_KEY, initial]] : []);
  return {
    values,
    getItem: async (key: string) => values.get(key),
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

test("launch history persists, orders recent opens, and distinguishes installations", async () => {
  const storage = memoryStorage();
  const history = new RecentApplications(storage);
  await Promise.all([history.record("/A.app"), history.record("/B.app"), history.record("/A.app")]);
  assert.deepEqual(history.getSnapshot(), ["/A.app", "/B.app"]);
  const reopened = new RecentApplications(storage);
  await reopened.load();
  assert.deepEqual(reopened.getSnapshot(), ["/A.app", "/B.app"]);
});

test("recent apps skip missing installations and honor view limits", () => {
  const apps = prepareApplications(["A", "B", "C", "D"].map((name) => ({ name, path: `/${name}.app` })));
  const paths = ["/missing.app", "/D.app", "/B.app", "/A.app", "/C.app"];
  assert.deepEqual(
    recentApplications(paths, apps, 3).map((app) => app.name),
    ["D", "B", "A"],
  );
  assert.deepEqual(
    recentApplications(paths, apps, 8).map((app) => app.name),
    ["D", "B", "A", "C"],
  );
});

test("malformed history is ignored and failed saves can be retried", async () => {
  const storage = memoryStorage("invalid");
  let fail = true;
  const history = new RecentApplications({
    getItem: storage.getItem,
    setItem: async (key, value) => {
      if (fail) throw new Error("unavailable");
      await storage.setItem(key, value);
    },
  });
  await assert.rejects(history.record("/A.app"), /unavailable/);
  assert.deepEqual(history.getSnapshot(), []);
  fail = false;
  await history.record("/B.app");
  assert.deepEqual(history.getSnapshot(), ["/B.app"]);
});
