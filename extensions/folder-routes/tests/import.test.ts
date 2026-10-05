import assert from "node:assert/strict";
import test from "node:test";

import type { Destination } from "../src/domain/destination";
import {
  buildImportPreview,
  countImportStatuses,
  mergeImportedDestinations,
  parseJsonImport,
} from "../src/domain/import";

const existing: Destination = {
  id: "existing-id",
  name: "Invoices",
  path: "/Users/example/Invoices",
  keywords: ["billing"],
  copy: true,
  move: true,
  pinned: false,
};

test("JSON import requires an array and validates field types", () => {
  assert.deepEqual(parseJsonImport('{"name":"Invoices"}').fatalErrors, ["The JSON root must be an array."]);

  const parsed = parseJsonImport(
    JSON.stringify([
      {
        name: "Invoices",
        path: "/Users/example/Invoices",
        keywords: "billing",
        copy: "true",
      },
    ]),
  );
  assert.equal(parsed.entries[0].draft, undefined);
  assert.deepEqual(parsed.entries[0].errors, ["keywords must be an array of strings.", "copy must be a boolean."]);
});

test("preview distinguishes valid, duplicate, invalid, and missing-folder entries", async () => {
  const parsed = parseJsonImport(
    JSON.stringify([
      { name: "Archive", path: "/Archive" },
      { name: "Invoices", path: "/Other" },
      { name: "", path: "/Invalid" },
      { name: "Missing", path: "/Missing" },
    ]),
  );
  const preview = await buildImportPreview(
    parsed,
    [existing],
    async (path) => path !== "/Missing",
    () => "generated-id",
  );

  assert.deepEqual(countImportStatuses(preview), {
    valid: 1,
    duplicate: 1,
    invalid: 1,
    missingFolder: 1,
  });
  assert.deepEqual(
    preview.items.map((item) => item.status),
    ["valid", "duplicate", "invalid", "missing-folder"],
  );
});

test("skip strategy imports only non-duplicate valid entries", async () => {
  const parsed = parseJsonImport(
    JSON.stringify([
      { name: "Archive", path: "/Archive" },
      { name: "Invoices", path: "/Other" },
    ]),
  );
  let id = 0;
  const preview = await buildImportPreview(
    parsed,
    [existing],
    async () => true,
    () => `id-${(id += 1)}`,
  );
  const result = mergeImportedDestinations([existing], preview, "skip");

  assert.equal(result.importedCount, 1);
  assert.equal(result.skippedCount, 1);
  assert.deepEqual(
    result.destinations.map((item) => item.name),
    ["Invoices", "Archive"],
  );
});

test("replace strategy removes all matching saved destinations before adding the import", async () => {
  const parsed = parseJsonImport(JSON.stringify([{ name: "Invoices", path: "/New", pinned: true }]));
  const preview = await buildImportPreview(
    parsed,
    [existing],
    async () => true,
    () => "replacement-id",
  );
  const result = mergeImportedDestinations([existing], preview, "replace");

  assert.equal(result.replacedCount, 1);
  assert.equal(result.destinations.length, 1);
  assert.equal(result.destinations[0].path, "/New");
});

test("skip strategy prevents duplicate IDs, names, and paths from entering the library", async () => {
  const parsed = parseJsonImport(
    JSON.stringify([
      { id: "existing-id", name: "Invoices Copy", path: "/Invoices Copy" },
      { id: "name-collision", name: "Invoices", path: "/Other" },
      { id: "path-collision", name: "Archive", path: "/Users/example/Invoices" },
    ]),
  );
  const preview = await buildImportPreview(parsed, [existing], async () => true);
  const result = mergeImportedDestinations([existing], preview, "skip");

  assert.equal(result.importedCount, 0);
  assert.equal(result.skippedCount, 3);
  assert.deepEqual(result.destinations, [existing]);
});
