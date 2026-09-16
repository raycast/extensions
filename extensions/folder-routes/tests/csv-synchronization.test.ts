import assert from "node:assert/strict";
import test from "node:test";

import { formatCsvSynchronizationErrors, validateCsvSynchronization } from "../src/domain/csv-synchronization";

const header = "id,name,path,keywords,copy,move,pinned\n";

test("CSV synchronization accepts a complete, unique source of truth", async () => {
  const validation = await validateCsvSynchronization(
    `${header}invoices,Invoices,/Invoices,"invoice;billing",true,true,false\narchive,Archive,/Archive,old,true,true,true\n`,
    async () => true,
  );

  assert.deepEqual(validation.fatalErrors, []);
  assert.deepEqual(validation.issues, []);
  assert.deepEqual(
    validation.destinations.map((destination) => destination.id),
    ["invoices", "archive"],
  );
  assert.deepEqual(validation.destinations[0].keywords, ["invoice", "billing"]);
});

test("CSV synchronization requires a stable ID for every entry", async () => {
  const validation = await validateCsvSynchronization(
    `${header},Invoices,/Invoices,,true,true,false\n`,
    async () => true,
  );

  assert.deepEqual(formatCsvSynchronizationErrors(validation), [
    "CSV line 2: A stable ID is required for synchronization.",
  ]);
});

test("CSV synchronization detects duplicate IDs, names, and normalized paths", async () => {
  const validation = await validateCsvSynchronization(
    `${header}same,Invoices,/Invoices,,true,true,false\nsame,INVOICES,/Invoices/,,true,true,false\n`,
    async () => true,
  );

  assert.deepEqual(formatCsvSynchronizationErrors(validation), ["CSV line 3: Duplicates an earlier id, name, path."]);
});

test("CSV synchronization reports missing destination folders", async () => {
  const validation = await validateCsvSynchronization(
    `${header}missing,Missing,/Missing,,true,true,false\n`,
    async () => false,
  );

  assert.deepEqual(formatCsvSynchronizationErrors(validation), [
    "CSV line 2: Folder does not exist or is not a directory: /Missing",
  ]);
});

test("CSV synchronization accepts a header-only CSV to clear the destination library", async () => {
  const validation = await validateCsvSynchronization(header, async () => true);

  assert.deepEqual(validation, { destinations: [], fatalErrors: [], issues: [] });
});
