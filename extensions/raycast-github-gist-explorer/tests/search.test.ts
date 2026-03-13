import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSearchDocuments,
  createSearchIndex,
  searchDocuments,
} from "../src/lib/search";
import { GistRecord } from "../src/lib/types";

const gists: GistRecord[] = [
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
    updatedAt: "2025-01-01T00:00:00.000Z",
    files: [
      {
        filename: "memo.txt",
        rawUrl: "https://gist.githubusercontent.com/2/raw",
        size: 10,
        truncated: false,
        content: "aliases are handy for git status",
      },
    ],
  },
];

test("filename matches outrank content matches", () => {
  const documents = buildSearchDocuments(gists);
  const index = createSearchIndex(documents, gists);
  const results = searchDocuments(index, "aliases");

  assert.equal(results[0]?.gistId, "1");
});

test("content matches return matching gists", () => {
  const documents = buildSearchDocuments(gists);
  const index = createSearchIndex(documents, gists);
  const results = searchDocuments(index, "handy");

  assert.equal(results[0]?.gistId, "2");
});
