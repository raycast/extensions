import { environment } from "@raycast/api";
import { mkdir } from "fs/promises";
import { DatabaseSync } from "node:sqlite";
import path from "path";

const dbPath = path.join(environment.supportPath, "vault.db");

let supportDirReady = false;

export async function withDb<T>({ run }: { run: (db: DatabaseSync) => T }): Promise<T> {
  if (!supportDirReady) {
    await mkdir(environment.supportPath, { recursive: true });
    supportDirReady = true;
  }
  const db = new DatabaseSync(dbPath);
  try {
    return run(db);
  } finally {
    db.close();
  }
}

export type Db = DatabaseSync;
