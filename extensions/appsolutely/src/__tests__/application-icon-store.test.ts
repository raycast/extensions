import assert from "node:assert/strict";
import { test } from "node:test";
import { ApplicationIconStore } from "../services/application-icon-store.ts";

const tick = () => new Promise((resolve) => setImmediate(resolve));

test("native views do no icon work until a large view requests icons", async () => {
  const calls: string[] = [];
  const store = new ApplicationIconStore(async (path) => {
    calls.push(path);
    return `/cache/${path}.png`;
  });
  const unsubscribe = store.subscribe(() => undefined);
  await tick();
  assert.deepEqual(calls, []);
  assert.equal(store.getSnapshot().size, 0);
  const release = store.acquire(["Editor"]);
  await tick();
  assert.deepEqual(calls, ["Editor"]);
  assert.equal(store.getSnapshot().get("Editor"), "/cache/Editor.png");
  release();
  unsubscribe();
});

test("leaving large view cancels queued icons and bounds already running work to four", async () => {
  const calls: string[] = [];
  const finish: (() => void)[] = [];
  const store = new ApplicationIconStore((path) => {
    calls.push(path);
    return new Promise((resolve) => finish.push(() => resolve(`/cache/${path}.png`)));
  });
  const release = store.acquire(Array.from({ length: 12 }, (_, index) => `App${index}`));
  await tick();
  assert.equal(calls.length, 4);
  release();
  release();
  for (const resolve of finish) resolve();
  await tick();
  assert.equal(calls.length, 4);
  assert.equal(store.getSnapshot().size, 0);
});

test("switching away before workers start avoids icon lookup entirely", async () => {
  let calls = 0;
  const store = new ApplicationIconStore(async () => {
    calls++;
    return undefined;
  });
  const release = store.acquire(["Editor", "Browser"]);
  release();
  await tick();
  assert.equal(calls, 0);
});

test("navigation views share in-flight icons until the final consumer leaves", async () => {
  let calls = 0;
  let finish!: (image: string) => void;
  const store = new ApplicationIconStore(() => {
    calls++;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  const parent = store.acquire(["Editor", "Editor"]);
  const child = store.acquire(["Editor"]);
  await tick();
  assert.equal(calls, 1);
  parent();
  finish("/cache/editor.png");
  await tick();
  assert.equal(store.getSnapshot().get("Editor"), "/cache/editor.png");
  child();
});

test("unavailable icons settle to native fallback independently of successful icons", async () => {
  const store = new ApplicationIconStore(async (path) => {
    if (path === "Broken") throw new Error("Unavailable");
    return path === "Missing" ? undefined : "/cache/editor.png";
  });
  const release = store.acquire(["Editor", "Broken", "Missing"]);
  await tick();
  const icons = store.getSnapshot();
  assert.equal(icons.get("Editor"), "/cache/editor.png");
  assert.equal(icons.has("Broken"), true);
  assert.equal(icons.get("Broken"), undefined);
  assert.equal(icons.has("Missing"), true);
  release();
});

test("returning to large view reuses icons until the catalog is refreshed", async () => {
  let image = "/cache/editor.png";
  let calls = 0;
  const store = new ApplicationIconStore(async () => {
    calls++;
    return image;
  });
  const first = store.acquire(["Editor"]);
  await tick();
  first();
  image = "/cache/editor-updated.png";
  const second = store.acquire(["Editor"]);
  assert.equal(store.getSnapshot().get("Editor"), "/cache/editor.png");
  await tick();
  assert.equal(calls, 1);
  store.invalidate();
  await tick();
  assert.equal(store.getSnapshot().get("Editor"), image);
  assert.equal(calls, 2);
  second();
});

test("preview and grid share in-flight work and cancellation releases preview requests", async () => {
  const calls: string[] = [];
  const finish = new Map<string, (image: string) => void>();
  const store = new ApplicationIconStore((path) => {
    calls.push(path);
    return new Promise((resolve) => finish.set(path, resolve));
  });
  const grid = store.acquire(["Editor"]);
  const preview = store.resolve(["Editor"]);
  await tick();
  assert.deepEqual(calls, ["Editor"]);
  finish.get("Editor")!("/cache/editor.png");
  assert.equal((await preview).get("Editor"), "/cache/editor.png");
  grid();

  const controller = new AbortController();
  const cancelled = store.resolve(["Cancelled"], controller.signal);
  controller.abort();
  assert.equal((await cancelled).size, 0);
  await tick();
  assert.deepEqual(calls, ["Editor"]);
});

test("refresh during an in-flight request discards the old result and reloads it", async () => {
  const finish: ((image: string) => void)[] = [];
  const store = new ApplicationIconStore(() => new Promise((resolve) => finish.push(resolve)));
  const release = store.acquire(["Editor"]);
  await tick();
  store.invalidate();
  finish[0]("old.png");
  await tick();
  assert.equal(store.getSnapshot().has("Editor"), false);
  assert.equal(finish.length, 2);
  finish[1]("new.png");
  await tick();
  assert.equal(store.getSnapshot().get("Editor"), "new.png");
  release();
});

test("icon completions are batched into one subscriber notification", async () => {
  const store = new ApplicationIconStore(async (path) => path);
  let notifications = 0;
  const unsubscribe = store.subscribe(() => notifications++);
  const release = store.acquire(["A", "B", "C"]);
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(notifications, 1);
  release();
  unsubscribe();
});
