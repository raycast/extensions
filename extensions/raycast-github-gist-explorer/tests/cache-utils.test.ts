import assert from "node:assert/strict";
import test from "node:test";
import { removeGistFromCachePayload } from "../src/lib/cache-payload";
import { CachePayload } from "../src/lib/types";

const payload: CachePayload = {
  gists: [
    {
      id: "1",
      description: "Useful shell aliases",
      htmlUrl: "https://gist.github.com/1",
      public: false,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z",
      files: [
        {
          filename: "aliases.sh",
          rawUrl: "https://gist.githubusercontent.com/1/raw",
          size: 10,
          truncated: false,
          content: "alias gs='git status'",
        },
      ],
    },
    {
      id: "2",
      description: "Notes",
      htmlUrl: "https://gist.github.com/2",
      public: true,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-03T00:00:00.000Z",
      files: [
        {
          filename: "memo.txt",
          rawUrl: "https://gist.githubusercontent.com/2/raw",
          size: 10,
          truncated: false,
          content: "aliases are handy",
        },
      ],
    },
  ],
  documents: [
    {
      id: "1",
      gistId: "1",
      description: "Useful shell aliases",
      filenamesText: "aliases.sh",
      contentText: "alias gs='git status'",
      public: false,
      updatedAt: "2025-01-02T00:00:00.000Z",
      fileCount: 1,
      filenames: ["aliases.sh"],
    },
    {
      id: "2",
      gistId: "2",
      description: "Notes",
      filenamesText: "memo.txt",
      contentText: "aliases are handy",
      public: true,
      updatedAt: "2025-01-03T00:00:00.000Z",
      fileCount: 1,
      filenames: ["memo.txt"],
    },
  ],
  metadata: {
    lastSyncedAt: "2025-01-03T00:00:00.000Z",
    gistCount: 2,
    indexVersion: 1,
  },
};

test("removeGistFromCachePayload removes gist and rebuilds documents", () => {
  const next = removeGistFromCachePayload(payload, "1");

  assert.deepEqual(
    next.gists.map((gist) => gist.id),
    ["2"],
  );
  assert.deepEqual(
    next.documents.map((document) => document.gistId),
    ["2"],
  );
  assert.equal(next.metadata.gistCount, 1);
});

test("removeGistFromCachePayload leaves payload unchanged when gist is missing", () => {
  const next = removeGistFromCachePayload(payload, "missing");

  assert.deepEqual(next.gists, payload.gists);
  assert.deepEqual(next.documents, payload.documents);
  assert.equal(next.metadata.gistCount, payload.metadata.gistCount);
});
