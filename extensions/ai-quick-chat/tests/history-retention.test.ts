import assert from "node:assert/strict";
import test from "node:test";
import { selectSessionsToKeep } from "../src/history-retention";
import type { SessionMetadata } from "../src/types";

function session(id: string, updatedAt: string, bytes: number): SessionMetadata {
  return {
    id,
    title: id,
    providerId: "provider",
    providerName: "Provider",
    modelId: "model",
    messageCount: 2,
    createdAt: updatedAt,
    updatedAt,
    bytes,
  };
}

const sessions = [
  session("new", "2026-09-05T03:00:00.000Z", 40),
  session("middle", "2026-09-05T02:00:00.000Z", 40),
  session("old", "2026-09-05T01:00:00.000Z", 40),
];

test("enforces a user-selected conversation count", () => {
  const result = selectSessionsToKeep(sessions, { sessionLimit: 2 }, 1_000);
  assert.deepEqual(result.kept.map((item) => item.id), ["new", "middle"]);
  assert.deepEqual(result.removed.map((item) => item.id), ["old"]);
});

test("removes oldest conversations first at the byte cap", () => {
  const result = selectSessionsToKeep(sessions, { sessionLimit: "unlimited" }, 80);
  assert.deepEqual(result.kept.map((item) => item.id), ["new", "middle"]);
  assert.equal(result.bytes, 80);
});

test("never removes the active conversation during its save", () => {
  const result = selectSessionsToKeep(sessions, { sessionLimit: "unlimited" }, 40, "old");
  assert.deepEqual(result.kept.map((item) => item.id), ["old"]);
  assert.equal(result.overLimit, false);
});
