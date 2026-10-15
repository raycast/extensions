import { getPreferenceValues } from "@raycast/api";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { JsonLinesClient } from "./jsonl";
import { scoped, type DigupHit, type FsearchHit } from "./query";

// One daemon, `truffle serve`, answers everything on one socket: names and contents (its own ops) and meaning
// ("meaning.*" ops). It starts on the first `truffle` command if it isn't running (or at login, after
// `truffle install --login`).

type Preferences = { trufflePath?: string; nameFilters?: string };

const home = os.homedir();
const expand = (p: string) => (p.startsWith("~/") ? path.join(home, p.slice(2)) : p);
const prefs = getPreferenceValues<Preferences>();
export const truffleBin = expand(prefs.trufflePath || "~/.local/bin/truffle");

const SOCKET = path.join(home, "Library/Application Support/Truffle/truffle.sock");
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let encoderState = "stopped";
const client = new JsonLinesClient(SOCKET);
let started = false;

function startDaemon(): void {
  if (started || !fs.existsSync(truffleBin)) return;
  started = true;
  // Any query starts the daemon; `status` is the cheapest.
  spawn(truffleBin, ["status"], { detached: true, stdio: "ignore" }).unref();
}

async function request(body: Record<string, unknown>, timeoutMs = 5000) {
  try {
    return await client.request(body, timeoutMs);
  } catch {
    startDaemon();
  }
  const deadline = Date.now() + 8000;
  let last: unknown;
  while (Date.now() < deadline) {
    await sleep(150);
    try {
      return await client.request(body, timeoutMs);
    } catch (error) {
      last = error;
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

// Names and contents.

export type FsearchStatus = { ready: boolean; fullDiskAccess: boolean; entries: number; message?: string };

export async function fsearchStatus(): Promise<FsearchStatus> {
  if (!fs.existsSync(truffleBin))
    return { ready: false, fullDiskAccess: false, entries: 0, message: "truffle isn't installed" };
  const reply = await request({ op: "status" });
  if (reply.ok !== true) return { ready: false, fullDiskAccess: false, entries: 0, message: String(reply.error ?? "") };
  return { ready: true, fullDiskAccess: reply.full_disk_access === true, entries: Number(reply.entries ?? 0) };
}

type RawGrepFile = { path: string; matches?: { line: number; text: string }[] };

export async function fsearchSearch(q: string, limit = 30): Promise<FsearchHit[]> {
  const reply = await request({ q: scoped(q, prefs.nameFilters ?? ""), limit, boost: true });
  if (reply.ok !== true) throw new Error(String(reply.error ?? "truffle failed"));
  if (Array.isArray(reply.files)) {
    return (reply.files as RawGrepFile[]).map((file) => ({
      path: file.path,
      kind: "file",
      mtime: 0,
      size: 0,
      score: 0,
      lines: (file.matches ?? []).slice(0, 5).map((m) => ({ line: m.line, text: m.text })),
    }));
  }
  return (reply.hits as FsearchHit[] | undefined) ?? [];
}

/** What was opened or committed lately, best first. */
export async function fsearchRecent(limit = 20): Promise<FsearchHit[]> {
  const reply = await request({ op: "recent", limit });
  return reply.ok === true ? ((reply.hits as FsearchHit[] | undefined) ?? []) : [];
}

/** Tells truffle a file was opened, so it ranks higher for a while. */
export function fsearchOpened(file: string): void {
  client.request({ op: "open", path: file }, 2000).catch(() => {});
}

/** After Full Disk Access is granted the daemon must restart to index Desktop, Documents and Downloads. */
export async function restartFsearch(): Promise<void> {
  spawn("/usr/bin/pkill", ["-f", `${truffleBin} serve`], { stdio: "ignore" });
  await sleep(500);
  client.close();
  started = false;
  startDaemon();
}

// Meaning.

export type DigupStatus = {
  encoder: string;
  vectors: number;
  codeVectors: number;
  folders: string[];
  message?: string;
};

export async function digupStatus(): Promise<DigupStatus> {
  if (!fs.existsSync(truffleBin))
    return { encoder: "unavailable", vectors: 0, codeVectors: 0, folders: [], message: "truffle isn't installed" };
  const folders = await request({ op: "meaning.folders" });
  // Folders held for want of Full Disk Access are still chosen (and what's indexed in them still found).
  const list = [
    ...((folders.folders as string[] | undefined) ?? []),
    ...((folders.held as string[] | undefined) ?? []),
  ];
  if (list.length === 0) return { encoder: "stopped", vectors: 0, codeVectors: 0, folders: [] };
  const warm = await request({ op: "meaning.prewarm" }, 30_000);
  if (warm.ok === false)
    return { encoder: "unavailable", vectors: 0, codeVectors: 0, folders: list, message: String(warm.error ?? "") };
  encoderState = String(warm.encoder ?? encoderState);
  return { encoder: encoderState, vectors: Number(warm.vectors ?? 0), codeVectors: 0, folders: list };
}

export type DigupResult = { hits: DigupHit[]; strong: number; meaning: boolean; warning?: string };

export async function digupSearch(
  q: string,
  opts: { code: boolean; meaning: boolean; limit?: number },
): Promise<DigupResult> {
  const reply = await request(
    {
      op: "meaning.search",
      q,
      code: opts.code,
      meaning: opts.meaning,
      prefix_last: !opts.meaning,
      limit: opts.limit ?? 30,
    },
    opts.meaning ? 30_000 : 5000,
  );
  if (reply.ok === false) throw new Error(String(reply.error ?? "meaning search failed"));
  return {
    hits: ((reply.hits as RawMeaningHit[] | undefined) ?? []).map(toHit),
    strong: Number(reply.strong ?? 0),
    meaning: reply.meaning === true,
    warning: typeof reply.warning === "string" ? reply.warning : undefined,
  };
}

/** Truffle's hits, in the shape the list shows. */
type RawMeaningHit = DigupHit & { segment_id?: number; segmentId?: number };
function toHit(h: RawMeaningHit): DigupHit {
  // Missing values arrive as null: the list treats them as absent.
  const clean = Object.fromEntries(Object.entries(h).filter(([, v]) => v !== null)) as RawMeaningHit;
  return { ...clean, segment_id: clean.segment_id ?? clean.segmentId ?? 0, info: clean.info ?? {} };
}

/** Embeds what's typed so far, so the vector is ready when typing pauses. */
export function digupEmbedAhead(q: string, code: boolean): void {
  client.request({ op: "meaning.embed_ahead", q, code }, 30_000).catch(() => {});
}

/** A JPEG of a PDF page, a video frame or a picture, for the preview. */
export async function digupRender(
  file: string,
  kind: "pdf" | "video" | "image",
  loc?: number,
): Promise<string | undefined> {
  const reply = await request({ op: "meaning.render", path: file, kind, loc, pixels: 900 }, 20_000);
  return typeof reply.image === "string" ? reply.image : undefined;
}

export async function digupText(segment: number, code: boolean): Promise<string | undefined> {
  const reply = await request({ op: "meaning.text", segment, code });
  return typeof reply.text === "string" ? reply.text : undefined;
}

export { home };
