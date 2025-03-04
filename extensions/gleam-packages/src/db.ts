import { resolve } from "path";
import { writeFile } from "fs/promises";
import { environment } from "@raycast/api";
import { executeSQL } from "@raycast/utils";
import { fetch } from "cross-fetch";
import * as cache from "./cache";
import { Package } from "./types";

const dbName = "packages.sqlite";
const db = resolve(environment.supportPath, dbName);
const sqliteURL = "https://packages.gleam.run/packages.sqlite";
const query = `SELECT
  id,
  name,
  description,
  inserted_in_hex_at,
  updated_in_hex_at,
  docs_url,
  links
FROM packages
ORDER BY updated_in_hex_at DESC`;

export async function getPackages() {
  return await executeSQL<Package>(db, query);
}

export async function refreshPackages() {
  try {
    const response = await fetch(sqliteURL);
    const buffer = await response.arrayBuffer();
    await writeFile(db, Buffer.from(buffer));
    cache.setLastRefreshAt();
  } catch (error) {
    throw Error("Failed to fetch packages");
  }
}
