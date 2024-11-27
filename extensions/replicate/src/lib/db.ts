import { environment } from "@raycast/api";
import fetch from "node-fetch";
import initSqlJs, { Database } from "sql.js";
import { writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DB_FILE_PATH } from "../constants";
import { buildPaginatedUrl, isUrl, showAuthError, succeeded } from "../utils/helpers";
import { PredictionResponse } from "../types";

export const createTables = `
CREATE TABLE Prediction (
    id TEXT NOT NULL PRIMARY KEY,
    src TEXT NOT NULL,
    url TEXT NOT NULL,
    prompt TEXT
);`;

export const initiDb = async () => {
  const SQL = await initSqlJs({
    locateFile: () => resolve(environment.assetsPath, "sql-wasm.wasm"),
  });
  const file = await readFile(DB_FILE_PATH);
  const db = new SQL.Database(file);
  try {
    db.exec("SELECT * FROM Prediction");
  } catch (err) {
    db.run(createTables);
    const buffer = Buffer.from(db.export());
    writeFileSync(DB_FILE_PATH, buffer, "binary");
  }
  return db;
};

export const populateDbFromApi = async (db: Database, cursor: string | undefined) => {
  const { apiEndpoint, headers } = buildPaginatedUrl(cursor);
  const res = await fetch(apiEndpoint.toString(), { headers });
  const data = (await res.json()) as PredictionResponse;
  if (res.status === 401) {
    const message = data?.detail || "Unauthorized";
    return showAuthError(message);
  }
  let broke = false;

  const predictions = data.results.filter(succeeded).filter(isUrl);
  //   Iterate over the data and insert it into the database
  //   When we entounter an ID that already exists, we stop
  for (const prediction of predictions) {
    const { id, urls, input, output, status } = prediction;
    if (status !== "succeeded") continue;

    // Output might have multiple images
    const normalized = typeof output === "string" ? [output] : output?.entries();
    for (const [index, src] of normalized) {
      const theId = `${id}-${index}`;
      const select = db.prepare(`SELECT * FROM Prediction WHERE id =:id`);
      const res = select.getAsObject({ ":id": theId });
      if (res?.id) {
        broke = true;
        break;
      }
      db.run("INSERT INTO Prediction (id, src, url, prompt) VALUES (?, ?, ?, ?)", [
        theId,
        src,
        urls?.get,
        input?.prompt ?? null,
      ]);
    }
  }
  //   If there's a cursor, we need to fetch more data
  //   But only if we didnt break out of the loop
  if (data.next && !broke) {
    // extract the cursor from the url and fetch more
    await populateDbFromApi(db, data.next.split("cursor=").pop());
  }
  return true;
};
