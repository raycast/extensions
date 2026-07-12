import {
  mkdir,
  readFile,
  readdir,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import type { GroundPacketRecord } from "../domain/types";

const RECORD_FILENAME = /^[0-9a-f-]+\.json$/i;
const RECORD_ID = /^[0-9a-f-]+$/i;

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

export async function deleteGroundPacketInDirectory(
  directory: string,
  id: string,
): Promise<void> {
  await unlink(recordPath(directory, id)).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  });
}
