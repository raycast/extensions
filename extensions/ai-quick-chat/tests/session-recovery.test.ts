import assert from "node:assert/strict";
import test from "node:test";
import { interruptStaleStreamingMessages } from "../src/session-recovery";
import type { ChatSession } from "../src/types";

function session(status: "complete" | "streaming" | "interrupted" | "error"): ChatSession {
  return {
    id: "session",
    title: "Session",
    providerId: "provider",
    providerName: "Provider",
    modelId: "model",
    systemPrompt: "",
    createdAt: "2026-09-05T00:00:00.000Z",
    updatedAt: "2026-09-05T00:00:00.000Z",
    messages: [
      {
        id: "assistant",
        role: "assistant",
        content: "Partial response",
        status,
        createdAt: "2026-09-05T00:00:00.000Z",
      },
    ],
  };
}

test("marks stale streaming messages as interrupted", () => {
  const original = session("streaming");
  const recovered = interruptStaleStreamingMessages(original);
  assert.notEqual(recovered, original);
  assert.equal(recovered.messages[0]?.status, "interrupted");
  assert.equal(recovered.messages[0]?.content, "Partial response");
});

test("leaves completed sessions unchanged", () => {
  const original = session("complete");
  assert.equal(interruptStaleStreamingMessages(original), original);
});
