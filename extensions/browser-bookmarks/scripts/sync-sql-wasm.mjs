import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "node_modules", "sql.js", "dist", "sql-wasm.wasm");
const targetDir = path.join(root, "assets");
const target = path.join(targetDir, "sql-wasm.wasm");

async function syncSqlWasm() {
  if (!existsSync(source)) {
    console.warn(`[sync-sql-wasm] Skipping: source wasm not found at ${source}`);
    return;
  }

  const sourceBuffer = await readFile(source);
  const targetBuffer = existsSync(target) ? await readFile(target) : null;

  if (targetBuffer && Buffer.compare(sourceBuffer, targetBuffer) === 0) {
    console.log("[sync-sql-wasm] sql-wasm.wasm is already up to date");
    return;
  }

  await mkdir(targetDir, { recursive: true });
  await copyFile(source, target);
  console.log("[sync-sql-wasm] Synced assets/sql-wasm.wasm from sql.js");
}

syncSqlWasm().catch((error) => {
  console.error("[sync-sql-wasm] Failed to sync sql-wasm.wasm", error);
  process.exit(1);
});
