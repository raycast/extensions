import test from "node:test";
import assert from "node:assert/strict";
import { mutateInBatches } from "../src/lib/operations";
import { matchesSearch } from "../src/lib/query";
import { TaggedFile } from "../src/lib/models";

const file = (path: string): TaggedFile => ({
  path,
  name: "receipt.pdf",
  tags: [{ name: "receipts", color: 0 }],
  kind: "PDF",
  contentTypes: ["com.adobe.pdf", "public.data"],
  modifiedAt: "2026-03-12T10:00:00Z",
  size: 12,
  changed: true,
});

test("a later native transport failure preserves earlier successes and reports every uncertain file", async () => {
  const paths = Array.from({ length: 205 }, (_, i) => `/file-${i}`);
  const progress: number[] = [];
  const result = await mutateInBatches(
    [...paths, paths[0]],
    { kind: "add", tags: ["receipts"] },
    async (batch) => {
      if (batch.includes("/file-100")) throw new Error("Native process exited");
      return { files: batch.map(file), failures: [] };
    },
    (done) => progress.push(done),
  );
  assert.equal(result.files.length, 105);
  assert.equal(result.failures.length, 100);
  assert.match(result.failures[0].message, /Could not verify/);
  assert.deepEqual(progress, [100, 200, 205]);
});

test("current metadata rejects stale indexed hits and enforces kind and both date bounds", () => {
  const input = {
    tags: ["receipts"],
    match: "all" as const,
    kind: "pdf",
    modifiedAfter: "2026-03-01",
    modifiedBefore: "2026-04-01",
  };
  assert.equal(matchesSearch(file("/receipt.pdf"), input), true);
  assert.equal(matchesSearch({ ...file("/a"), tags: [] }, input), false);
  assert.equal(matchesSearch({ ...file("/a"), contentTypes: ["public.image"] }, input), false);
  assert.equal(matchesSearch({ ...file("/a"), modifiedAt: "2026-04-01T00:00:00Z" }, input), false);
  assert.equal(matchesSearch({ ...file("/a"), modifiedAt: null }, input), false);
});
