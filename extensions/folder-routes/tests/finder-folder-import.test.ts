import assert from "node:assert/strict";
import test from "node:test";

import type { Destination } from "../src/domain/destination";
import {
  buildFinderFolderImportPreview,
  countFinderFolderImportStatuses,
  finderFolderImportDestinations,
} from "../src/domain/finder-folder-import";

const existing: Destination = {
  id: "existing",
  name: "Archive",
  path: "/Users/example/Archive",
  keywords: ["archive"],
  copy: true,
  move: false,
  pinned: false,
};

test("Finder folder preview applies chosen defaults and skips files and saved folders", async () => {
  const preview = await buildFinderFolderImportPreview(
    ["/Users/example/Archive", "/Users/example/Invoices", "/Users/example/report.pdf"],
    [existing],
    async (path) => !path.endsWith(".pdf"),
    { copy: true, move: false, pinned: true },
  );

  assert.deepEqual(countFinderFolderImportStatuses(preview), { valid: 1, duplicate: 1, notFolder: 1 });
  assert.deepEqual(finderFolderImportDestinations(preview), [
    {
      id: "invoices",
      name: "Invoices",
      path: "/Users/example/Invoices",
      keywords: ["Invoices"],
      copy: true,
      move: false,
      pinned: true,
    },
  ]);
});

test("Finder folder preview makes same-name folders and IDs distinct", async () => {
  const preview = await buildFinderFolderImportPreview(
    ["/Users/example/Client A/Invoices", "/Users/example/Client B/Invoices"],
    [],
    async () => true,
    { copy: false, move: false, pinned: false },
  );

  assert.deepEqual(
    finderFolderImportDestinations(preview).map(({ id, name, keywords }) => ({ id, name, keywords })),
    [
      { id: "invoices", name: "Invoices", keywords: ["Invoices"] },
      { id: "invoices_2", name: "Invoices (2)", keywords: ["Invoices"] },
    ],
  );
});

test("Finder folder preview skips the same selected folder after its first occurrence", async () => {
  const preview = await buildFinderFolderImportPreview(
    ["/Users/example/Invoices", "/Users/example/Invoices/"],
    [],
    async () => true,
    { copy: false, move: false, pinned: false },
  );

  assert.deepEqual(countFinderFolderImportStatuses(preview), { valid: 1, duplicate: 1, notFolder: 0 });
});
