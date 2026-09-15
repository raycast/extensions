import { environment } from "@raycast/api";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { IndexProgress, LocalIndex } from "./types";

const INDEX_FILENAME = "academic-local-index.json";

export function localIndexPath(): string {
  return join(environment.supportPath, INDEX_FILENAME);
}

export async function loadLocalIndex(): Promise<LocalIndex> {
  try {
    const parsed = JSON.parse(
      await readFile(localIndexPath(), "utf8"),
    ) as LocalIndex;
    if (parsed.version === 1 && Array.isArray(parsed.documents)) return parsed;
  } catch {
    // A missing or interrupted first index is equivalent to an empty index.
  }
  return {
    version: 1,
    updatedAt: new Date(0).toISOString(),
    folders: [],
    documents: [],
  };
}

export async function saveLocalIndex(index: LocalIndex): Promise<void> {
  const path = localIndexPath();
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(
    temporary,
    JSON.stringify({ ...index, updatedAt: new Date().toISOString() }),
    { encoding: "utf8", mode: 0o600 },
  );
  await rename(temporary, path);
}

export async function queueLocalDocumentsForReprocessing(
  ids?: string[],
): Promise<number> {
  const index = await loadLocalIndex();
  const selected = ids ? new Set(ids) : undefined;
  let count = 0;
  for (const document of index.documents) {
    if (selected && !selected.has(document.id)) continue;
    document.stage = "discovered";
    document.analysis = undefined;
    document.embedding = undefined;
    document.error = undefined;
    document.updatedAt = new Date().toISOString();
    count += 1;
  }
  await saveLocalIndex(index);
  return count;
}

export function indexProgress(index: LocalIndex): IndexProgress {
  const total = index.documents.length;
  const discovered = total;
  const extracted = index.documents.filter(
    (document) => document.evidence,
  ).length;
  const identified = index.documents.filter((document) => document.work).length;
  const verified = index.documents.filter(
    (document) => document.validation?.safe,
  ).length;
  const enriched = index.documents.filter(
    (document) => document.analysis,
  ).length;
  const review = index.documents.filter(
    (document) => document.stage === "review",
  ).length;
  const errors = index.documents.filter(
    (document) => document.stage === "error",
  ).length;
  const analysisEnabled = index.analysisEnabled === true;
  const completedUnits = analysisEnabled ? extracted + enriched : extracted;
  return {
    total,
    discovered,
    extracted,
    identified,
    verified,
    enriched,
    review,
    errors,
    percent: total
      ? Math.round((completedUnits / (total * (analysisEnabled ? 2 : 1))) * 100)
      : 100,
  };
}
