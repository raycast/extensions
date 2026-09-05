import assert from "node:assert/strict";
import test from "node:test";

import { CsvParseError, parseCsv } from "../src/domain/csv";
import { parseCsvImport } from "../src/domain/import";

test("parseCsv handles commas, escaped quotes, CRLF, and quoted newlines", () => {
  const rows = parseCsv(
    "name,path,keywords,copy,move,pinned\r\n" +
      '"Invoices, Europe","/Users/example/Documents/Invoices","invoice;""billing""",true,true,false\r\n' +
      '"Two\nLines","/Users/example/Two Lines",,true,false,false\r\n',
  );

  assert.equal(rows.length, 3);
  assert.deepEqual(rows[1].values, [
    "Invoices, Europe",
    "/Users/example/Documents/Invoices",
    'invoice;"billing"',
    "true",
    "true",
    "false",
  ]);
  assert.equal(rows[2].values[0], "Two\nLines");
});

test("parseCsv rejects unclosed quoted fields", () => {
  assert.throws(() => parseCsv('name,path\n"Broken,/tmp'), CsvParseError);
});

test("parseCsvImport trims values and applies optional defaults", () => {
  const parsed = parseCsvImport(
    "name,path,keywords,copy,move,pinned\n Invoices , /Users/example/Invoices , invoice ; billing ,,,\n",
  );

  assert.deepEqual(parsed.fatalErrors, []);
  assert.equal(parsed.entries.length, 1);
  assert.deepEqual(parsed.entries[0].draft, {
    id: undefined,
    name: "Invoices",
    path: "/Users/example/Invoices",
    keywords: ["invoice ", " billing"],
    copy: true,
    move: true,
    pinned: false,
  });
});

test("parseCsvImport reports malformed booleans per entry", () => {
  const parsed = parseCsvImport("name,path,copy\nInvoices,/tmp,yes\n");

  assert.equal(parsed.entries[0].draft, undefined);
  assert.deepEqual(parsed.entries[0].errors, ["copy must be true or false."]);
});
