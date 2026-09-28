/// <reference types="node" />

import { createReadStream } from "fs";
import { readdir } from "fs/promises";
import { homedir } from "os";
import path from "path";
import { createInterface } from "readline";

import type { Artifact } from "../types/artifact";

/**
 * Claude Code's session transcripts — one `.jsonl` per session, grouped into a
 * directory per project.
 *
 * This is the ONLY local record of a publish besides the index itself. When the
 * recording hook misses one (it is best-effort by design and exits 0 on every
 * failure path), the transcript is what makes the artifact recoverable at all.
 */
export const TRANSCRIPTS_DIR = path.join(homedir(), ".claude", "projects");

/**
 * Matches an artifact URL in either scheme, with the id segment treated as an
 * opaque token.
 *
 * Two schemes are live and both must keep working:
 *
 * - `https://claude.ai/code/artifact/<uuid>` — everything published up to
 *   ~2026-09-10.
 * - `https://claude.ai/artifact/<22-char slug>` — everything since.
 *
 * Deliberately NOT pinned to a UUID. That is the exact mistake that made this
 * module necessary: the recording hook matched `[0-9a-fA-F-]{36}`, the id
 * format changed to a base62 slug, and nine days of publishes vanished while
 * every other signal still read healthy. The `claude.ai/…/artifact/` prefix is
 * the stable, identifying part; the tail is not ours and will move again.
 *
 * Kept in sync with `URL_PATTERN` in `scripts/record-artifact.sh`.
 */
export const ARTIFACT_URL_RE = /https:\/\/claude\.ai\/(?:code\/)?artifact\/[A-Za-z0-9_-]{16,64}/;

/**
 * Cheap substring test applied to every raw line before `JSON.parse`.
 *
 * The transcript corpus is ~1.5 GB across several thousand files and fewer than
 * 0.2% of lines mention an artifact at all. Parsing each line to find that out
 * costs about two orders of magnitude more than a substring scan. Measured
 * 2026-09-19: 2,968 files / 269,748 lines / 486 candidates in 2.1s.
 */
const CANDIDATE_MARKER = "/artifact/";

export interface ScanResult {
  artifacts: Artifact[];
  /** How many transcript files were read to completion. */
  filesScanned: number;
  /**
   * Files that could not be read at all.
   *
   * Counted separately because a skipped file is a HOLE in the scan: its
   * artifacts are invisible, so "nothing missing" would be a claim the scan did
   * not earn. Folding these into `filesScanned` is what let an incomplete scan
   * report full coverage.
   */
  filesFailed: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Parsed epoch milliseconds for a transcript timestamp, or `undefined`.
 *
 * Dedupe orders on this rather than on the raw string. A lexical comparison
 * treats any string as a timestamp, so a corrupt `"z"` sorts above every real
 * ISO date and lets a garbage record overwrite the good one for the same id.
 */
function timestampMs(timestamp: unknown): number | undefined {
  const raw = asString(timestamp);
  if (!raw) return undefined;
  const ms = new Date(raw).getTime();
  return Number.isNaN(ms) ? undefined : ms;
}

/**
 * Local calendar date for a transcript timestamp.
 *
 * Transcript timestamps are UTC ISO strings; the index stores a LOCAL
 * `YYYY-MM-DD`, because that is what the recording hook writes (`date
 * '+%Y-%m-%d'`). Converting through UTC instead would shift late-evening
 * publishes onto the following day and make backfilled rows disagree with
 * hook-written ones for the same artifact.
 *
 * Built by hand rather than via `toLocaleDateString`, whose output format is
 * locale-dependent and therefore not reliably `YYYY-MM-DD`.
 *
 * Known and accepted limitation: this resolves in the timezone the BACKFILL
 * runs in, not the one the publish happened in. Backfilling a late-evening
 * publish after moving timezones can therefore assign a date one day off from
 * what the hook would have written at the time. The transcript records an
 * instant and no local offset, so there is nothing to recover the original
 * zone from — and a date that is off by a day still sorts and reads correctly.
 */
function localDate(timestamp: unknown): string | undefined {
  const raw = asString(timestamp);
  if (!raw) return undefined;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return undefined;

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Extract the artifact a transcript entry published, if it published one.
 *
 * `toolUseResult` carries the tool's own response. Its shape has changed
 * repeatedly — eight distinct key sets appear in the corpus — so the test is
 * behavioral rather than structural:
 *
 * 1. A `url` that is exactly an artifact URL. A *publish* response stores the
 *    URL as its own field; prose that merely mentions one does not.
 * 2. At least one of `title` / `artifact_id` / `path`, which every publish
 *    response carries and no read response does. This is what separates a
 *    publish from an `ArtifactData` read, whose result also has a `url` but
 *    describes content rather than creation.
 * 3. Not explicitly someone else's. `audience` appears on newer responses;
 *    anything other than `"owner"` is an artifact shared with the user, which
 *    the index records separately and must not be attributed to them. Absent
 *    `audience` is an older response and is treated as theirs, matching what
 *    the hook recorded at the time.
 */
function publishedArtifact(entry: unknown): Artifact | null {
  if (!isRecord(entry)) return null;

  const result = entry.toolUseResult;
  if (!isRecord(result)) return null;

  const rawUrl = asString(result.url);
  if (!rawUrl) return null;

  // EXTRACT the URL rather than testing the whole field, because that is what
  // the recorder does (`grep -oE`, first match) and the two must agree by
  // construction. A field carrying a trailing query string or fragment would
  // otherwise be recorded by the hook and rejected here — the same artifact
  // arriving under two different identities, which is a duplicate row rather
  // than a missing one and therefore the harder failure to notice.
  const match = ARTIFACT_URL_RE.exec(rawUrl);
  if (!match) return null;
  const url = match[0];

  // `version` is the publish marker. Measured across the whole local corpus on
  // 2026-09-19: all 74 publish responses carry it and neither non-publish
  // response does. The obvious alternative — "has a title or an id" — is not
  // sufficient, and the counter-example is real: an `action: "open"` result is
  // shaped `{ artifact_id, opened, title, url }` and would be recorded as a
  // publish the user never made.
  //
  // Chosen to fail CLOSED. If a future publish shape drops `version`, that
  // publish is not backfilled — a visible, recoverable gap that Doctor's
  // coverage check reports. The opposite error attributes someone else's
  // artifact to the user and is silent.
  if (typeof result.version !== "string") return null;

  const identifiesAPublish =
    typeof result.title === "string" || typeof result.artifact_id === "string" || typeof result.path === "string";
  if (!identifiesAPublish) return null;

  // Strict: anything present and not `"owner"` is rejected, including a
  // non-string. Coercing first and then testing would let `audience: 123`
  // through as "no audience stated", which is the one reading that must not
  // silently mean "mine".
  if (result.audience !== undefined && result.audience !== "owner") return null;

  // The index keys on the URL's last segment, because that is what survives a
  // republish (the URL is stable; `artifact_id` is a separate internal id that
  // does NOT match the slug under the current scheme). The recording hook
  // derives the id the same way, so backfilled rows collide correctly with
  // hook-written ones instead of duplicating them.
  const id = url.slice(url.lastIndexOf("/") + 1);
  if (!id) return null;

  const cwd = asString(entry.cwd);

  return {
    id,
    title: asString(result.title) ?? id,
    url,
    updated: localDate(entry.timestamp),
    owner: "mine",
    project: cwd ? path.basename(cwd) : undefined,
    cwd,
  };
}

/**
 * Every `.jsonl` under the transcripts directory, at any depth.
 *
 * `recursive: true` is the stdlib doing the walk. A hand-rolled version lived
 * here first and returned byte-identical results on the real corpus (4,214
 * files), which is the argument for deleting it rather than keeping it.
 *
 * Resolves to `[]` rather than throwing on a missing or unreadable directory:
 * a machine that has never run Claude Code has no transcripts, and that is a
 * normal state, not an error. The caller distinguishes "none found" from
 * "scan succeeded and found nothing" by the file count.
 */
async function transcriptFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { recursive: true, withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".jsonl"))
      .map((entry) => path.join(entry.parentPath, entry.name));
  } catch {
    return [];
  }
}

/**
 * Every artifact publish recorded in the local transcripts, newest wins.
 *
 * Resolves rather than rejecting on a bad file: a truncated transcript from an
 * interrupted session is common, and one unreadable file must not lose the
 * other three thousand.
 */
export async function scanTranscripts(): Promise<ScanResult> {
  const files = await transcriptFiles(TRANSCRIPTS_DIR);

  // Keyed by artifact id. A republish writes a second entry with the same URL,
  // and the later one carries the current title and date — so last-seen wins,
  // ordered by the entry's own timestamp rather than by file traversal order,
  // which is arbitrary across directories.
  const byId = new Map<string, { artifact: Artifact; at: number | undefined }>();
  let filesScanned = 0;
  let filesFailed = 0;

  for (const file of files) {
    try {
      const lines = createInterface({
        input: createReadStream(file, { encoding: "utf8" }),
        crlfDelay: Infinity,
      });

      for await (const line of lines) {
        if (!line.includes(CANDIDATE_MARKER)) continue;

        let entry: unknown;
        try {
          entry = JSON.parse(line);
        } catch {
          // A partially-written final line is expected in a transcript from a
          // session that was killed. Skip it.
          continue;
        }

        const artifact = publishedArtifact(entry);
        if (!artifact) continue;

        const at = isRecord(entry) ? timestampMs(entry.timestamp) : undefined;
        const existing = byId.get(artifact.id);

        // Strictly later wins, and an undated record never displaces a dated
        // one. `>=` would hand ties to whichever file the recursive walk
        // happened to reach second, which is arbitrary across directories —
        // so ties keep the first record rather than depending on traversal.
        const supersedes = !existing || (at !== undefined && (existing.at === undefined || at > existing.at));
        if (supersedes) byId.set(artifact.id, { artifact, at });
      }
      // Counted only here, once the file has been read through. A file that
      // vanished or could not be opened must not inflate the coverage figure.
      filesScanned += 1;
    } catch {
      // Unreadable — permissions, or it vanished mid-scan. Keep going, but say so.
      filesFailed += 1;
      continue;
    }
  }

  return { artifacts: [...byId.values()].map((v) => v.artifact), filesScanned, filesFailed };
}
