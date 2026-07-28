import assert from "node:assert/strict";
import test from "node:test";

const paginationModulePath = "./pagination.ts";
const paginationModule = import(paginationModulePath) as Promise<
  typeof import("./pagination")
>;

const isNumber = (value: unknown): value is number => typeof value === "number";

test("collects pages until the stop condition is met", async () => {
  const { collectPaginatedEntries } = await paginationModule;
  const requestedCursors: Array<string | null> = [];
  const pages = new Map<string | null, unknown>([
    [null, { data: [3, 2], nextCursor: "next" }],
    ["next", { data: [1], nextCursor: "unused" }],
    ["unused", { data: [0], nextCursor: null }],
  ]);

  const entries = await collectPaginatedEntries({
    requestPage: async (cursor) => {
      requestedCursors.push(cursor);
      return pages.get(cursor);
    },
    isEntry: isNumber,
    description: "test pages",
    shouldStop: (values) => values.includes(1),
  });

  assert.deepEqual(entries, [3, 2, 1]);
  assert.deepEqual(requestedCursors, [null, "next"]);
});

test("honors a hard page limit", async () => {
  const { collectPaginatedEntries } = await paginationModule;
  let requestCount = 0;

  const entries = await collectPaginatedEntries({
    requestPage: async () => ({
      data: [requestCount],
      nextCursor: `cursor-${++requestCount}`,
    }),
    isEntry: isNumber,
    description: "test pages",
    maxPages: 3,
  });

  assert.deepEqual(entries, [0, 1, 2]);
  assert.equal(requestCount, 3);
});

test("rejects malformed entries", async () => {
  const { collectPaginatedEntries } = await paginationModule;
  await assert.rejects(
    collectPaginatedEntries({
      requestPage: async () => ({ data: [1, "invalid"], nextCursor: null }),
      isEntry: isNumber,
      description: "test pages",
    }),
    /invalid test pages response/,
  );
});

test("rejects repeated cursors", async () => {
  const { collectPaginatedEntries } = await paginationModule;
  await assert.rejects(
    collectPaginatedEntries({
      requestPage: async () => ({ data: [1], nextCursor: "same" }),
      isEntry: isNumber,
      description: "test pages",
    }),
    /repeated cursor/,
  );
});
