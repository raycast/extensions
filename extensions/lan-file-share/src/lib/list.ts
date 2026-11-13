import { randomUUID } from "node:crypto";
import { listPath, readJson, writeJsonAtomic } from "./config";
import { controlCall } from "./service";
import { LIST_VERSION, type ShareEntry, type ShareEntryType } from "./types";

type ListFile = { version: number; entries: ShareEntry[] };

async function readLocalList(): Promise<ShareEntry[]> {
  const parsed = await readJson<ListFile>(listPath());
  if (!Array.isArray(parsed?.entries)) return [];
  return parsed.entries.filter(
    (entry) => entry && typeof entry.id === "string",
  );
}

/**
 * The service owns the list while it runs, and the panel only touches the file when nothing is listening, so
 * there is never more than one writer.
 */
export async function listShareEntries(): Promise<ShareEntry[]> {
  const fromService = await controlCall<{ entries: ShareEntry[] }>(
    "GET",
    "/list",
  );
  if (fromService.ok) return fromService.data.entries ?? [];
  return await readLocalList();
}

export async function addShareEntry(input: {
  type: ShareEntryType;
  name: string;
  path?: string;
  content?: string;
}): Promise<ShareEntry> {
  const entry: ShareEntry = {
    id: randomUUID(),
    source: "host",
    addedAt: new Date().toISOString(),
    ...input,
  };
  const viaService = await controlCall<{ entry: ShareEntry }>(
    "POST",
    "/list",
    entry,
  );
  if (viaService.ok) return viaService.data.entry ?? entry;
  if (viaService.reason === "error") throw new Error(viaService.message);

  const entries = await readLocalList();
  await writeJsonAtomic(listPath(), {
    version: LIST_VERSION,
    entries: [entry, ...entries],
  });
  return entry;
}

export async function removeShareEntry(id: string): Promise<void> {
  const viaService = await controlCall<{ ok: boolean }>(
    "DELETE",
    `/list?id=${encodeURIComponent(id)}`,
  );
  if (viaService.ok) return;
  if (viaService.reason === "error") throw new Error(viaService.message);

  const entries = (await readLocalList()).filter((entry) => entry.id !== id);
  await writeJsonAtomic(listPath(), { version: LIST_VERSION, entries });
}
