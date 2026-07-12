import { createGroundPacket } from "../domain/packet";
import {
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import type { FileHandle } from "node:fs/promises";
import type { GroundPacketDraft, GroundPacketRecord } from "../domain/types";

const RECORD_FILENAME = /^[0-9a-f-]+\.json$/i;
const RECORD_ID = /^[0-9a-f-]+$/i;
const LOCK_RETRY_MS = 20;
const LOCK_TIMEOUT_MS = 2_000;
const STALE_LOCK_MS = 5_000;

type MoveToTrash = (path: string) => Promise<void>;

function recordPath(directory: string, id: string): string {
  if (!RECORD_ID.test(id))
    throw new Error("Invalid internal packet identifier.");
  return join(directory, `${id}.json`);
}

function looksLikeRecord(value: unknown): value is GroundPacketRecord {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<GroundPacketRecord>;
  return (
    candidate.schemaVersion === 1 &&
    candidate.format === "ground-relay.packet" &&
    candidate.formatVersion === "1.0" &&
    typeof candidate.id === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.version === "number" &&
    Boolean(candidate.draft)
  );
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function withLineageLock<T>(
  directory: string,
  rootId: string,
  operation: () => Promise<T>,
): Promise<T> {
  if (!RECORD_ID.test(rootId))
    throw new Error("Invalid internal lineage identifier.");

  await mkdir(directory, { recursive: true });
  const lockPath = join(directory, `.${rootId}.lineage.lock`);
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  let handle: FileHandle | undefined;

  while (!handle) {
    try {
      handle = await open(lockPath, "wx");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;

      const lockAge = await stat(lockPath)
        .then((value) => Date.now() - value.mtimeMs)
        .catch(() => 0);
      if (lockAge > STALE_LOCK_MS) {
        await unlink(lockPath).catch(() => undefined);
        continue;
      }
      if (Date.now() >= deadline) {
        throw new Error(
          "Another correction is still being appended. Try again.",
        );
      }
      await delay(LOCK_RETRY_MS);
    }
  }

  try {
    return await operation();
  } finally {
    await handle.close();
    await unlink(lockPath).catch(() => undefined);
  }
}

export async function listGroundPacketsInDirectory(
  directory: string,
): Promise<GroundPacketRecord[]> {
  await mkdir(directory, { recursive: true });
  const filenames = (await readdir(directory)).filter((name) =>
    RECORD_FILENAME.test(name),
  );
  const records = await Promise.all(
    filenames.map(async (filename): Promise<GroundPacketRecord | undefined> => {
      try {
        const value = JSON.parse(
          await readFile(join(directory, filename), "utf8"),
        ) as unknown;
        return looksLikeRecord(value) ? value : undefined;
      } catch {
        return undefined;
      }
    }),
  );
  return records
    .filter((record): record is GroundPacketRecord => Boolean(record))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function appendGroundPacketInDirectory(
  directory: string,
  record: GroundPacketRecord,
): Promise<void> {
  await mkdir(directory, { recursive: true });
  const destination = recordPath(directory, record.id);
  const temporary = join(
    directory,
    `.${record.id}.${process.pid}.${Date.now()}.tmp`,
  );
  await writeFile(temporary, JSON.stringify(record, null, 2), {
    encoding: "utf8",
    flag: "wx",
  });
  try {
    await rename(temporary, destination);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

export async function appendCorrectionInDirectory(
  directory: string,
  base: GroundPacketRecord,
  draft: GroundPacketDraft,
): Promise<GroundPacketRecord> {
  return withLineageLock(directory, base.rootId, async () => {
    const lineage = (await listGroundPacketsInDirectory(directory))
      .filter((record) => record.rootId === base.rootId)
      .sort(
        (a, b) =>
          b.version - a.version ||
          b.createdAt.localeCompare(a.createdAt) ||
          b.id.localeCompare(a.id),
      );
    const latest = lineage[0];
    if (!latest) throw new Error("This packet lineage no longer exists.");
    if (latest.id !== base.id) {
      throw new Error(
        `This lineage advanced to v${latest.version}. Reopen the latest packet before correcting it.`,
      );
    }

    const record = createGroundPacket(draft, {
      rootId: latest.rootId,
      version: latest.version + 1,
      supersedesId: latest.id,
    });
    await appendGroundPacketInDirectory(directory, record);
    return record;
  });
}

export async function deleteGroundPacketInDirectory(
  directory: string,
  id: string,
  moveToTrash: MoveToTrash,
): Promise<void> {
  await moveToTrash(recordPath(directory, id)).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  });
}
