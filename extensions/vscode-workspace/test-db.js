import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { homedir } from "os";

const dbPath = path.join(
  homedir(),
  "AppData",
  "Roaming",
  "Code",
  "User",
  "globalStorage",
  "state.vscdb"
);

console.log("DB Path:", dbPath);
console.log("DB exists:", fs.existsSync(dbPath));

if (fs.existsSync(dbPath)) {
  const db = new Database(dbPath, { readonly: true });

  // Check if the table exists
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log("Tables:", tables.map(t => t.name));

  // Check if the key exists
  const keyExists = db.prepare("SELECT key FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList'").get();
  console.log("Key exists:", !!keyExists);

  // Get the raw value
  const rawValue = db.prepare("SELECT value FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList'").get();
  console.log("Raw value length:", rawValue?.value?.length);

  // Try the exact query from db.ts
  const result = db.prepare("SELECT json_extract(value, '$.entries') as entries FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList'").get();
  console.log("Entries length:", result?.entries?.length);

  if (result?.entries) {
    const parsed = JSON.parse(result.entries);
    console.log("Parsed entries count:", parsed.length);
    console.log("First entry:", JSON.stringify(parsed[0], null, 2));
  }

  db.close();
}
