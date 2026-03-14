import assert from "node:assert/strict";
import test from "node:test";
import {
  filterByAsyncPredicate,
  searchRootsInParallel,
  searchRootsWithPartialFallback,
} from "../src/lib/file-search-concurrency.ts";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("searchRootsInParallel collects fulfilled files and failed roots", async () => {
  let active = 0;
  let maxActive = 0;

  const result = await searchRootsInParallel(
    ["root-a", "root-b", "root-c"],
    async (root) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await sleep(15);
      active -= 1;

      if (root === "root-b") {
        throw new Error("mdfind unavailable for root-b");
      }

      return [`/${root}/note.md`];
    },
  );

  assert.deepEqual(result.files, ["/root-a/note.md", "/root-c/note.md"]);
  assert.deepEqual(result.failedRoots, ["root-b"]);
  assert.equal(maxActive >= 2, true);
});

test("searchRootsWithPartialFallback only scans failed roots", async () => {
  const fallbackCalls: string[][] = [];

  const files = await searchRootsWithPartialFallback(
    ["alpha", "beta", "gamma"],
    async (root) => {
      if (root === "beta") {
        throw new Error("spotlight failed");
      }

      return [`/spotlight/${root}.txt`];
    },
    async (failedRoots) => {
      fallbackCalls.push([...failedRoots]);
      return failedRoots.map((root) => `/fallback/${root}.txt`);
    },
  );

  assert.deepEqual(fallbackCalls, [["beta"]]);
  assert.deepEqual(files, [
    "/spotlight/alpha.txt",
    "/spotlight/gamma.txt",
    "/fallback/beta.txt",
  ]);
});

test("filterByAsyncPredicate runs checks concurrently and preserves input order", async () => {
  let active = 0;
  let maxActive = 0;

  const input = ["a", "b", "c", "d", "e", "f"];
  const output = await filterByAsyncPredicate(
    input,
    async (value) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await sleep(10);
      active -= 1;
      return value === "a" || value === "c" || value === "f";
    },
    3,
  );

  assert.deepEqual(output, ["a", "c", "f"]);
  assert.equal(maxActive >= 2, true);
});

test("filterByAsyncPredicate clamps invalid concurrency to safe defaults", async () => {
  const input = [1, 2, 3];
  const output = await filterByAsyncPredicate(
    input,
    async (value) => value >= 2,
    0,
  );

  assert.deepEqual(output, [2, 3]);
});
