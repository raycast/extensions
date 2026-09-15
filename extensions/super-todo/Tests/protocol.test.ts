import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSnapshot } from "../src/lib/protocol";

const todo = { id: "todo-1", title: "散歩する", position: 0, createdAt: 100 };

test("reads Swift's optional-field encoding", () => {
  assert.deepEqual(parseSnapshot(JSON.stringify({ todos: [todo] })), {
    todos: [todo],
    undoCandidate: undefined,
  });
  const completed = { ...todo, completedAt: 200 };
  assert.deepEqual(
    parseSnapshot(JSON.stringify({ todos: [], undoCandidate: completed }))
      .undoCandidate,
    completed,
  );
});

test("rejects malformed JSON and incompatible structures", () => {
  for (const raw of [
    "not json",
    "null",
    "[]",
    "{}",
    '{"todos":[null]}',
    '{"todos":{},"undoCandidate":null}',
  ]) {
    assert.throws(() => parseSnapshot(raw));
  }
  for (const invalid of [
    { ...todo, title: null },
    { ...todo, position: "0" },
    { ...todo, createdAt: null },
    { ...todo, completedAt: "yesterday" },
  ]) {
    assert.throws(() => parseSnapshot(JSON.stringify({ todos: [invalid] })));
  }
});

test("accepts null undo and preserves literal title content", () => {
  const literal = {
    ...todo,
    title: "<script>text</script> ' ; $(not-executed)",
  };
  assert.deepEqual(
    parseSnapshot(JSON.stringify({ todos: [literal], undoCandidate: null })),
    {
      todos: [literal],
      undoCandidate: null,
    },
  );
});
