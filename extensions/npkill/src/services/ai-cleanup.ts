import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Artifact, ScanRoot } from "../types";
import { cleanup } from "./cleanup";
import { isWithin, revalidateArtifact } from "./path-validation";
import { estimatedTotal } from "../utils/artifacts";

const MAX_AGE_MS = 30 * 60 * 1000;
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export interface CleanupInput {
  scanId: string;
  paths: string[];
}

interface Snapshot {
  createdAt: number;
  root: ScanRoot;
  artifacts: Artifact[];
}

function snapshotPath(storage: string, id: string): string {
  if (!ID_PATTERN.test(id)) throw new Error("Invalid scanId. Search for artifacts again.");
  return join(storage, `${id}.json`);
}

/** Save only the returned candidates, with their original discovery identities. */
export async function saveSnapshot(storage: string, root: ScanRoot, artifacts: Artifact[]): Promise<string> {
  await mkdir(storage, { recursive: true, mode: 0o700 });
  // Expired snapshots can never authorize cleanup. Bound retained local metadata as scans are made.
  for (const name of await readdir(storage)) {
    if (!/^[0-9a-f-]+\.json(?:\.claimed)?$/.test(name)) continue;
    const path = join(storage, name);
    try {
      if (Date.now() - (await stat(path)).mtimeMs > MAX_AGE_MS) await rm(path, { force: true });
    } catch {
      // Another tool invocation may have consumed this snapshot already.
    }
  }
  const id = randomUUID();
  const snapshot: Snapshot = { createdAt: Date.now(), root, artifacts };
  await writeFile(snapshotPath(storage, id), JSON.stringify(snapshot), { mode: 0o600, flag: "wx" });
  return id;
}

async function loadSelection(storage: string, input: CleanupInput) {
  if (
    !Array.isArray(input.paths) ||
    input.paths.length < 1 ||
    input.paths.length > 100 ||
    input.paths.some((path) => typeof path !== "string") ||
    new Set(input.paths).size !== input.paths.length
  ) {
    throw new Error("Provide 1–100 distinct exact paths returned by search-artifacts.");
  }
  let snapshot: Snapshot;
  try {
    snapshot = JSON.parse(await readFile(snapshotPath(storage, input.scanId), "utf8"));
  } catch {
    throw new Error("Scan results are unavailable or already used for cleanup. Search for artifacts again.");
  }
  if (!Number.isFinite(snapshot.createdAt) || Date.now() - snapshot.createdAt > MAX_AGE_MS) {
    throw new Error("Scan results expired. Search for artifacts again before cleanup.");
  }
  const current = new Map(snapshot.artifacts.map((item) => [item.path, item]));
  const selected = input.paths.map((path) => {
    const item = current.get(path);
    if (!item) throw new Error(`Path was not returned by this scan: ${path}. Search for artifacts again.`);
    return item;
  });
  if (selected.some((item) => selected.some((other) => item !== other && isWithin(item.path, other.path))))
    throw new Error("Selection contains overlapping directories. Clean them separately.");
  return { snapshot, current, selected };
}

/** Runs before Raycast displays its confirmation. No filesystem mutations. */
export async function reviewCleanup(storage: string, input: CleanupInput) {
  const { snapshot, selected } = await loadSelection(storage, input);
  for (const artifact of selected) await revalidateArtifact(snapshot.root, artifact);
  return {
    message: `Move ${selected.length} ${selected.length === 1 ? "directory" : "directories"} to Trash? ${estimatedTotal(selected)}. Moving to Trash does not immediately release disk space. Inspect local state and stop processes using these directories first.`,
    info: selected.map((item) => ({
      name: item.path,
      value: `${estimatedTotal([item])} · ${item.risk}${item.reason ? `: ${item.reason}` : ""}`,
    })),
  };
}

/** Consumes the scan once, then uses the same identity checks as native cleanup. */
export async function trashArtifacts(
  storage: string,
  input: CleanupInput,
  moveToTrash: (path: string) => Promise<void>,
) {
  const { snapshot, current, selected } = await loadSelection(storage, input);
  const path = snapshotPath(storage, input.scanId);
  const claimed = `${path}.claimed`;
  try {
    // Atomic claim: concurrent invocations and retries cannot reuse this scan's authority.
    await rename(path, claimed);
  } catch {
    throw new Error("This scan was already used for cleanup. Search for artifacts again.");
  }
  try {
    const results = await cleanup(snapshot.root, selected, current, moveToTrash);
    return {
      results: results.map((item) => ({
        path: item.path,
        status: item.status === "success" ? "trashed" : item.status,
        estimatedSizeBytes: item.size,
        error: item.error ?? null,
      })),
      trashedCount: results.filter((item) => item.status === "success").length,
      failedCount: results.filter((item) => item.status === "failed").length,
      missingCount: results.filter((item) => item.status === "missing").length,
      message: "Moving to Trash does not immediately release disk space. Search again before any further cleanup.",
    };
  } finally {
    // A cleanup side effect must not appear to fail just because metadata removal failed.
    await rm(claimed, { force: true }).catch(() => {});
  }
}
