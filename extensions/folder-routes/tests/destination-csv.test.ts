import assert from "node:assert/strict";
import test from "node:test";

import { prepareDestinationCsvAppend, serializeDestinationCsvRows } from "../src/domain/destination-csv";
import { parseCsvImport } from "../src/domain/import";

test("CSV append preserves the configured header order and escapes values", () => {
  const preparation = prepareDestinationCsvAppend("name,id,path,keywords,copy,move,pinned\n");
  const rows = serializeDestinationCsvRows(
    [
      {
        id: "client_files",
        name: "Client, Files",
        path: "/Users/example/Client Files",
        keywords: ["Client, Files", "client"],
        copy: false,
        move: true,
        pinned: false,
      },
    ],
    preparation.headers,
  );

  assert.equal(
    rows,
    '"Client, Files",client_files,/Users/example/Client Files,"Client, Files;client",false,true,false',
  );
});

test("CSV append requires every destination field", () => {
  assert.throws(
    () => prepareDestinationCsvAppend("id,name,path\nfolder,Folder,/Folder\n"),
    /must include: keywords, copy, move, pinned/,
  );
});

test("CSV serialization neutralizes spreadsheet formulas and restores the original values on import", () => {
  const headers = ["id", "name", "path", "keywords", "copy", "move", "pinned"];
  const rows = serializeDestinationCsvRows(
    [
      {
        id: "-dangerous-id",
        name: "=2+2",
        path: "/Safe Path",
        keywords: ["@mention"],
        copy: true,
        move: false,
        pinned: false,
      },
    ],
    headers,
  );

  assert.equal(rows, "'-dangerous-id,'=2+2,/Safe Path,'@mention,true,false,false");

  const parsed = parseCsvImport(`${headers.join(",")}\n${rows}\n`);
  assert.deepEqual(parsed.fatalErrors, []);
  assert.deepEqual(parsed.entries[0].draft, {
    id: "-dangerous-id",
    name: "=2+2",
    path: "/Safe Path",
    keywords: ["@mention"],
    copy: true,
    move: false,
    pinned: false,
  });
});

test("CSV formula protection preserves a literal leading apostrophe during round trips", () => {
  const headers = ["id", "name", "path", "keywords", "copy", "move", "pinned"];
  const rows = serializeDestinationCsvRows(
    [
      {
        id: "literal-apostrophe",
        name: "'=literal",
        path: "/Safe Path",
        keywords: [],
        copy: true,
        move: true,
        pinned: false,
      },
    ],
    headers,
  );

  assert.match(rows, /,''=literal,/);
  const parsed = parseCsvImport(`${headers.join(",")}\n${rows}\n`);
  assert.equal(parsed.entries[0].draft?.name, "'=literal");
});
