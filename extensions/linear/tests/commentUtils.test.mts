import assert from "node:assert/strict";
import test from "node:test";

import { Comment } from "@linear/sdk";

import { serializeComment } from "../src/tools/commentUtils.ts";

test("serializeComment returns a structured-cloneable tool result", async () => {
  const request = async () => ({});
  const comment = new Comment(request, {
    id: "comment-1",
    body: "I can reproduce this",
    createdAt: "2026-09-01T09:00:00.000Z",
    updatedAt: "2026-09-01T09:00:00.000Z",
    url: "https://linear.app/acme/issue/ENG-42#comment-comment-1",
    issueId: "issue-1",
    reactionData: {},
    reactions: [],
  } as never);

  assert.throws(() => structuredClone(comment), { name: "DataCloneError" });

  const result = await serializeComment(comment);

  assert.doesNotThrow(() => structuredClone(result));
  assert.deepEqual(result, {
    body: "I can reproduce this",
    createdAt: "2026-09-01T09:00:00.000Z",
    id: "comment-1",
    issueId: "issue-1",
    reactionData: {},
    updatedAt: "2026-09-01T09:00:00.000Z",
    url: "https://linear.app/acme/issue/ENG-42#comment-comment-1",
    reactions: [],
  });
});
