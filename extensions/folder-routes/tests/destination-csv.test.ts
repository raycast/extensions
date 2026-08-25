import assert from "node:assert/strict";
import test from "node:test";

import { prepareDestinationCsvAppend, serializeDestinationCsvRows } from "../src/domain/destination-csv";

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
