// Kept identical in the two independently distributed extensions.
import { randomUUID } from "node:crypto";
import {
  mkdir,
  open,
  readdir,
  readFile,
  link,
  unlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { uuid } from "../domain/validation-common";
export interface LedgerRecord {
  id: string;
  rootId: string;
  version: number;
  createdAt: string;
  supersedesId?: string;
}
export interface LedgerRead<T> {
  records: T[];
  warnings: string[];
}
export function recordPath(directory: string, id: string): string {
  if (!uuid(id)) throw new Error("Invalid record identifier.");
  return join(directory, `${id}.json`);
}
export async function readLedger<T extends LedgerRecord>(
  directory: string,
  valid: (value: unknown) => boolean,
): Promise<LedgerRead<T>> {
  let names: string[];
  try {
    names = await readdir(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return { records: [], warnings: [] };
    throw new Error(
      `Cannot read local ledger: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const records: T[] = [];
  const warnings: string[] = [];
  // Serial reads keep descriptor and memory pressure bounded for large ledgers.
  for (const name of names.filter(
    (n) => n.endsWith(".json") && !n.startsWith("."),
  )) {
    try {
      const value: unknown = JSON.parse(
        await readFile(join(directory, name), "utf8"),
      );
      if (!valid(value) || name !== `${(value as T).id}.json`)
        throw new Error("Invalid schema or filename identity");
      records.push(value as T);
    } catch (error) {
      warnings.push(
        `${name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  records.sort(
    (a, b) =>
      b.createdAt.localeCompare(a.createdAt) ||
      b.version - a.version ||
      a.id.localeCompare(b.id),
  );
  return { records, warnings };
}
export async function appendRecord<T extends LedgerRecord>(
  directory: string,
  record: T,
  valid: (value: unknown) => boolean,
): Promise<void> {
  if (!valid(record))
    throw new Error("Refusing to save an invalid ledger record.");
  await mkdir(directory, { recursive: true });
  const destination = recordPath(directory, record.id);
  const temporary = join(directory, `.${record.id}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, JSON.stringify(record, null, 2), {
      encoding: "utf8",
      flag: "wx",
    });
    // Hard-link publication is atomic and fails if the destination already exists.
    await link(temporary, destination);
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}
export async function withLineageLock<T>(
  directory: string,
  rootId: string,
  operation: () => Promise<T>,
): Promise<T> {
  recordPath(directory, rootId);
  await mkdir(directory, { recursive: true });
  const path = join(directory, `.${rootId}.lineage.lock`);
  const deadline = Date.now() + 2000;
  let handle;
  while (!handle) {
    try {
      handle = await open(path, "wx");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (Date.now() >= deadline)
        throw new Error(
          `Correction is locked. Retry after the other correction completes. If Raycast previously crashed, inspect the lock at ${path} before removing it.`,
        );
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  try {
    return await operation();
  } finally {
    await handle.close();
    await unlink(path);
  }
}
export function requireLatest<T extends LedgerRecord>(
  result: LedgerRead<T>,
  base: T,
): T {
  if (result.warnings.length)
    throw new Error(
      "The ledger contains unreadable records. Resolve its warnings before appending a correction.",
    );
  const lineage = result.records
    .filter((r) => r.rootId === base.rootId)
    .sort((a, b) => b.version - a.version);
  const latest = lineage[0];
  if (!latest) throw new Error("This lineage no longer exists.");
  if (
    latest.id !== base.id ||
    lineage.some((r) => r.version === latest.version && r.id !== latest.id)
  )
    throw new Error(
      `This lineage advanced to v${latest.version} or has competing versions. Reopen the latest record before correcting it.`,
    );
  return latest;
}

// Reserve trashed revision numbers before moving their contents to the system Trash.
// A failed trash operation can leave a harmless reservation; numbers are never reused.
export async function nextVersion(
  directory: string,
  rootId: string,
  records: LedgerRecord[],
): Promise<number> {
  let highest = Math.max(
    0,
    ...records.filter((r) => r.rootId === rootId).map((r) => r.version),
  );
  for (const name of (await readdir(directory)).filter(
    (n) => n.startsWith(".retired-") && n.endsWith(".json"),
  )) {
    const r = JSON.parse(
      await readFile(join(directory, name), "utf8"),
    ) as LedgerRecord;
    if (
      !uuid(r.id) ||
      !uuid(r.rootId) ||
      !Number.isSafeInteger(r.version) ||
      r.version < 1 ||
      name !== `.retired-${r.id}.json`
    )
      throw new Error(
        "Invalid deleted-version reservation; inspect the ledger before editing.",
      );
    if (r.rootId === rootId) highest = Math.max(highest, r.version);
  }
  return highest + 1;
}
export async function retireRecord<T extends LedgerRecord>(
  directory: string,
  id: string,
  valid: (v: unknown) => boolean,
  moveToTrash: (path: string) => Promise<void>,
): Promise<void> {
  const path = recordPath(directory, id);
  let r: T;
  try {
    r = JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  if (!valid(r) || r.id !== id)
    throw new Error("Cannot trash an invalid ledger record.");
  await withLineageLock(directory, r.rootId, async () => {
    const reservation = join(directory, `.retired-${id}.json`);
    const data = {
      id: r.id,
      rootId: r.rootId,
      version: r.version,
      createdAt: r.createdAt,
    };
    try {
      await writeFile(reservation, JSON.stringify(data), {
        encoding: "utf8",
        flag: "wx",
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const prior = JSON.parse(
        await readFile(reservation, "utf8"),
      ) as LedgerRecord;
      if (
        prior.id !== r.id ||
        prior.rootId !== r.rootId ||
        prior.version !== r.version
      )
        throw new Error("Conflicting deleted-version reservation.");
    }
    await moveToTrash(path);
  });
}
