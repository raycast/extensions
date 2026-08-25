import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { writeDestinationsToCsv } from "../src/services/destination-csv";

test("writing the destination library creates and then updates the configured CSV", async () => {
  const directory = await mkdtemp(join(tmpdir(), "folder-routes-test-"));
  const csvFile = join(directory, "destinations.csv");

  try {
    await writeDestinationsToCsv(csvFile, [
      {
        id: "invoices",
        name: "Invoices",
        path: "/Users/example/Invoices",
        keywords: ["invoices"],
        copy: true,
        move: true,
        pinned: false,
      },
    ]);
    assert.equal(
      await readFile(csvFile, "utf8"),
      "id,name,path,keywords,copy,move,pinned\ninvoices,Invoices,/Users/example/Invoices,invoices,true,true,false\n",
    );

    await writeFile(csvFile, "name,id,path,keywords,copy,move,pinned\n", "utf8");
    await writeDestinationsToCsv(csvFile, [
      {
        id: "archive",
        name: "Archive",
        path: "/Users/example/Archive",
        keywords: ["old"],
        copy: false,
        move: false,
        pinned: true,
      },
    ]);
    assert.equal(
      await readFile(csvFile, "utf8"),
      "name,id,path,keywords,copy,move,pinned\nArchive,archive,/Users/example/Archive,old,false,false,true\n",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
