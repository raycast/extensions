import assert from "node:assert/strict";
import test from "node:test";
import { HcConversation } from "./herdr-conversation.js";
function storage() {
  const data = new Map<string, string>();
  return {
    data,
    async getItem<T>(key: string) {
      return data.get(key) as T | undefined;
    },
    async setItem(key: string, value: string) {
      data.set(key, value);
    },
  };
}
const before = { text: "old question\nold answer\n", state: "idle", turn: 0, complete: true };
test("conversation stores explicit user messages and replaces a single streaming output without old history", async () => {
  const store = storage(),
    c = new HcConversation("target", "program", store);
  await c.load();
  await c.begin("one", "new question", before);
  c.submitted("one");
  c.observe({ ...before, text: before.text + "new response", state: "working" });
  c.observe({ ...before, text: before.text + "new response revised", state: "working" });
  c.observe({ ...before, text: before.text + "new response revised", state: "done", turn: 1 });
  assert.equal(c.turns.length, 1);
  assert.equal(c.turns[0]!.text, "new question");
  assert.equal(c.turns[0]!.output, "new response revised");
  assert.equal(c.turns[0]!.state, "done");
  c.observe({ ...before, text: "unrelated later output", turn: 2 });
  assert.equal(c.turns[0]!.output, "new response revised");
  await c.begin("two", "follow up", { ...before, text: before.text + "new response revised", turn: 1 });
  c.submitted("two");
  c.observe({ ...before, text: before.text + "new response revised\nsecond reply", turn: 2, state: "done" });
  assert.equal(c.turns.length, 2);
  assert.equal(c.turns[1]!.output, "second reply");
  await new Promise((resolve) => setImmediate(resolve));
  const restored = new HcConversation("target", "program", store);
  await restored.load();
  assert.deepEqual(restored.turns, c.turns);
  const other = new HcConversation("target", "replacement program", store);
  await other.load();
  assert.equal(other.turns.length, 0);
});
test("ambiguous redraw remains a raw fallback and is never stored as an assistant transcript", async () => {
  const store = storage(),
    c = new HcConversation("target", "program", store);
  await c.load();
  await c.begin("one", "question", before);
  c.submitted("one");
  c.observe({ ...before, text: "completely different full screen", state: "done", turn: 1 });
  assert.equal(c.turns[0]!.isolated, false);
  assert.equal(c.turns[0]!.output, "");
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(!store.data.get(c.storageKey)!.includes("completely different full screen"));
});
test("restored in-flight messages are not reattributed or replayed and uncertain sends remain unknown", async () => {
  const store = storage(),
    c = new HcConversation("t", "p", store);
  await c.load();
  await c.begin("one", "question", before);
  const restored = new HcConversation("t", "p", store);
  await restored.load();
  assert.equal(restored.turns[0]!.state, "unknown");
  restored.observe({ ...before, text: before.text + "later" });
  assert.equal(restored.turns[0]!.output, "");
  c.failed("one", false);
  assert.equal(c.turns[0]!.state, "unknown");
});
test("incomplete captures, changed capture and concurrent turns cannot finalize a guessed reply", async () => {
  const c = new HcConversation("t", "p", storage());
  await c.load();
  await c.begin("one", "q", before);
  c.submitted("one");
  c.observe({ ...before, text: before.text + "incomplete", state: "done", turn: 1, complete: false });
  assert.equal(c.turns[0]!.output, "");
  assert.equal(c.turns[0]!.state, "submitted");
  c.observe({ ...before, text: before.text + "changed", state: "done", turn: 1, stable: false });
  assert.equal(c.turns[0]!.output, "");
  c.observe({ ...before, text: before.text + "other actor", state: "done", turn: 3 });
  assert.equal(c.turns[0]!.state, "paused");
  assert.equal(c.turns[0]!.output, "");
});
test("history storage is bounded, corrupt records are retained and failed writes never claim delivery", async () => {
  const store = storage(),
    c = new HcConversation("t", "p", store);
  await c.load();
  for (let i = 0; i < 45; i++) {
    await c.begin(String(i), "q", before);
    c.failed(String(i), true);
  }
  assert.equal(c.turns.length, 40);
  const bad = new HcConversation("bad", "p", store);
  store.data.set(bad.storageKey, "not json");
  await bad.load();
  assert.equal(bad.ready, false);
  assert.ok(bad.error);
  assert.equal(store.data.get(bad.storageKey), "not json");
  const fail = new HcConversation("fail", "p", {
    ...store,
    async setItem() {
      throw new Error("disk full");
    },
  });
  await fail.load();
  await assert.rejects(fail.begin("x", "question", before), /Nothing was sent/);
  assert.equal(fail.turns[0]!.state, "rejected");
});

test("a stale ready snapshot cannot complete a new turn and unstable baselines stay a fallback", async () => {
  const c = new HcConversation("t", "p", storage());
  await c.load();
  await c.begin("one", "q", before);
  c.submitted("one");
  c.observe({ ...before, text: before.text + "prompt echo", state: "idle" });
  assert.equal(c.turns[0]!.state, "submitted");
  c.observe({ ...before, text: before.text + "actual answer", state: "done", turn: 1 });
  assert.equal(c.turns[0]!.output, "actual answer");
  assert.equal(c.turns[0]!.state, "done");
  await c.begin("two", "q", { ...before, complete: false });
  c.submitted("two");
  c.observe({ ...before, text: before.text + "not attributable", state: "done", turn: 1 });
  assert.equal(c.turns[1]!.isolated, false);
  assert.equal(c.turns[1]!.output, "");
});

test("restored submitted turns pause, duplicate stored IDs fail closed and target keys stay isolated", async () => {
  const store = storage(),
    c = new HcConversation("t", "p", store);
  await c.load();
  await c.begin("one", "q", before);
  c.submitted("one");
  await new Promise((resolve) => setImmediate(resolve));
  const restored = new HcConversation("t", "p", store);
  await restored.load();
  assert.equal(restored.turns[0]!.state, "paused");
  restored.observe({ ...before, text: before.text + "late reply", turn: 1, state: "done" });
  assert.equal(restored.turns[0]!.output, "");
  const other = new HcConversation("other-target", "p", store);
  await other.load();
  assert.equal(other.turns.length, 0);
  store.data.set(c.storageKey, JSON.stringify([c.turns[0], c.turns[0]]));
  const bad = new HcConversation("t", "p", store);
  await bad.load();
  assert.equal(bad.ready, false);
  assert.ok(bad.error);
});
