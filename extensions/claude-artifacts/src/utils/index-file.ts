// Imported from the `/errors` SUBPATH, not the root export. The root pulls in
// `showError` and therefore `@raycast/api`, which has no loadable runtime
// outside Raycast — that would make this module unloadable in plain Node and
// cost the headless testability of every parse branch below.
import { getErrorMessage } from "@chrismessina/raycast-kit/errors";
import { readFile } from "fs/promises";
import { homedir } from "os";
import path from "path";

import { parseUpdated } from "./dates";
import type { Artifact, ArtifactOwner, IndexProblem, IndexResult } from "../types/artifact";

/**
 * Absolute path to the index, resolved at runtime.
 *
 * Never hardcode a home directory: `os.homedir()` is correct on macOS, Linux,
 * and Windows, where `~` is not a thing the filesystem understands.
 */
export const INDEX_PATH = path.join(homedir(), ".claude", "artifacts.json");

const ARTIFACT_URL_PREFIX = "https://claude.ai/code/artifact/";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asOwner(value: unknown): ArtifactOwner | undefined {
  return value === "mine" || value === "shared" ? value : undefined;
}

/**
 * Coerce one unknown row into an `Artifact`, or `null` if it is unusable.
 *
 * The index is written by a shell hook, so a row can be partial or wrong-typed
 * without the file itself being invalid JSON. A bad row is skipped rather than
 * failing the whole read — one malformed entry must not blank the list.
 */
function parseArtifact(raw: unknown): Artifact | null {
  if (!isRecord(raw)) return null;

  const id = asOptionalString(raw.id);
  if (!id) return null;

  // A row missing its URL is still usable: the id determines it.
  const url = asOptionalString(raw.url) ?? `${ARTIFACT_URL_PREFIX}${id}`;
  // An untitled artifact is real (several seeded rows are lowercase slugs), so
  // fall back to the id rather than dropping the row.
  const title = asOptionalString(raw.title) ?? id;

  const cwd = asOptionalString(raw.cwd);
  // Prefer a stored project, but derive it from `cwd` when the hook omitted it.
  const project = asOptionalString(raw.project) ?? (cwd ? path.basename(cwd) : undefined);

  return {
    id,
    title,
    url,
    updated: asOptionalString(raw.updated),
    owner: asOwner(raw.owner),
    project,
    cwd,
  };
}

/**
 * Sort recency-first, undated last.
 *
 * Shared artifacts carry no `updated` date, so a naive comparator on
 * `undefined` would produce an unstable order. Dated rows sort newest-first;
 * undated rows sink to the bottom and sort by title so their order is at least
 * deterministic.
 */
export function compareArtifacts(a: Artifact, b: Artifact): number {
  // Sort on the PARSED date, not the raw string. A string comparison treats any
  // non-empty value as a date, so an unparseable one like "2026-07-25oops"
  // outranks a real "2026-07-24" — putting a row the UI labels "No date" above
  // genuinely recent work. Parsing first makes "invalid" and "absent" behave
  // identically, which is what the display already implies.
  const dateA = parseUpdated(a.updated)?.getTime();
  const dateB = parseUpdated(b.updated)?.getTime();

  if (dateA !== undefined && dateB !== undefined) {
    if (dateA === dateB) return a.title.localeCompare(b.title);
    return dateB - dateA;
  }
  if (dateA !== undefined) return -1;
  if (dateB !== undefined) return 1;
  return a.title.localeCompare(b.title);
}

function isMissingFileError(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT";
}

/**
 * Read and normalize the index.
 *
 * Resolves — never rejects — so the view can render a specific empty state
 * instead of an error screen. The three outcomes a caller must handle:
 * `problem: "missing"` (hook not installed), `problem: "malformed"` (file
 * exists but is unreadable), or a normal result with zero or more artifacts.
 */
export async function readIndex(): Promise<IndexResult> {
  const fail = (problem: IndexProblem, errorMessage?: string): IndexResult => ({
    artifacts: [],
    projects: [],
    problem,
    errorMessage,
  });

  let contents: string;

  try {
    contents = await readFile(INDEX_PATH, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) return fail("missing");
    return fail("malformed", getErrorMessage(error));
  }

  // An empty or whitespace-only file is a half-written index, not a missing one.
  // Reporting it as "missing" would send the user to the install-the-hook screen
  // when the hook is already installed and its write was interrupted — the
  // malformed screen is the useful one, because it reveals the file and offers
  // the error detail.
  if (contents.trim().length === 0) {
    return fail("malformed", `${INDEX_PATH} is empty. A write was likely interrupted.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch (error) {
    return fail("malformed", getErrorMessage(error));
  }

  // Accept either the versioned wrapper or a bare array, so a hand-edited or
  // early-format file still loads.
  const rows: unknown = isRecord(parsed) ? parsed.artifacts : parsed;
  if (!Array.isArray(rows)) {
    return fail("malformed", `Expected an "artifacts" array in ${INDEX_PATH}.`);
  }

  // Last-write-wins de-dupe by id: republishing an artifact updates the same
  // URL, so a hook that appended instead of upserting leaves duplicates behind.
  const byId = new Map<string, Artifact>();
  for (const row of rows) {
    const artifact = parseArtifact(row);
    if (artifact) byId.set(artifact.id, artifact);
  }

  const artifacts = [...byId.values()].sort(compareArtifacts);
  const projects = [...new Set(artifacts.map((a) => a.project).filter((p): p is string => Boolean(p)))].sort((a, b) =>
    a.localeCompare(b),
  );

  return { artifacts, projects };
}
