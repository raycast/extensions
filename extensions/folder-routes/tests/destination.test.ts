import assert from "node:assert/strict";
import test from "node:test";

import {
  type Destination,
  findDuplicateFields,
  normalizeKeywords,
  sortDestinations,
  validateDestinationDraft,
} from "../src/domain/destination";

const destination: Destination = {
  id: "one",
  name: "Invoices",
  path: "/Users/example/Documents/Invoices",
  keywords: [],
  copy: true,
  move: true,
  pinned: false,
};

test("destination validation requires an absolute path and trims fields", () => {
  const invalid = validateDestinationDraft({
    name: "Test",
    path: "relative/folder",
    keywords: [],
    copy: true,
    move: true,
    pinned: false,
  });
  assert.deepEqual(invalid.errors, ["Path must be absolute."]);

  const valid = validateDestinationDraft({
    name: "  Invoices  ",
    path: " /Users/example/Documents/Invoices/ ",
    keywords: [" invoice ", "INVOICE", "billing"],
    copy: true,
    move: false,
    pinned: true,
  });
  assert.equal(valid.value?.name, "Invoices");
  assert.equal(valid.value?.path, "/Users/example/Documents/Invoices");
  assert.deepEqual(valid.value?.keywords, ["invoice", "billing"]);
});

test("duplicate detection covers IDs, case-insensitive names, and normalized paths", () => {
  assert.deepEqual(
    findDuplicateFields(
      {
        id: "one",
        name: "INVOICES",
        path: "/Users/example/Documents/Invoices/",
      },
      [destination],
    ),
    ["id", "name", "path"],
  );
});

test("pinned destinations sort first and names sort deterministically", () => {
  const sorted = sortDestinations([
    destination,
    { ...destination, id: "two", name: "Archive", path: "/Archive", pinned: true },
    { ...destination, id: "three", name: "Bills", path: "/Bills" },
  ]);

  assert.deepEqual(
    sorted.map((item) => item.id),
    ["two", "three", "one"],
  );
});

test("normalizeKeywords removes empty and case-insensitive duplicates", () => {
  assert.deepEqual(normalizeKeywords([" one ", "", "ONE", "two"]), ["one", "two"]);
});
