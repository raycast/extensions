import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { getCodexHome, sessionsDir } from "./codex-paths";
import type { ThreadRow } from "./threads";

interface SessionMeta {
  id?: string;
  session_id?: string;
  cwd?: string;
  source?: string;
  thread_source?: string;
  timestamp?: string | number;
}

interface ParsedRollout {
  row: ThreadRow;
  mtime: number;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function timestampMs(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value > 100_000_000_000 ? value : value * 1000;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function passesInteractiveFilter(meta: SessionMeta): boolean {
  return (
    stringValue(meta.thread_source) !== "subagent" &&
    stringValue(meta.source) !== "exec" &&
    !stringValue(meta.source).startsWith("{")
  );
}

async function fileHead(path: string): Promise<ParsedRollout | null> {
  let fileStat;
  try {
    fileStat = await stat(path);
  } catch {
    return null;
  }

  const rows: string[] = [];
  const stream = createReadStream(path, { encoding: "utf8", start: 0, end: 512 * 1024 });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of lines) {
      rows.push(line);
      if (rows.length >= 100) break;
    }
  } finally {
    lines.close();
    stream.destroy();
  }

  if (!rows[0]) return null;
  let metaEnvelope: { payload?: SessionMeta };
  try {
    metaEnvelope = JSON.parse(rows[0]) as { payload?: SessionMeta };
  } catch {
    return null;
  }
  const meta = metaEnvelope.payload || {};
  const id = stringValue(meta.id || meta.session_id);
  const source = stringValue(meta.source);
  if (!id || !passesInteractiveFilter(meta)) return null;

  let firstUserMessage = "";
  let preview = "";
  for (const line of rows.slice(1)) {
    try {
      const event = JSON.parse(line) as { type?: string; payload?: { type?: string; message?: unknown } };
      if (event.type !== "event_msg" || event.payload?.type !== "user_message") continue;
      firstUserMessage = stringValue(event.payload.message);
      if (firstUserMessage) break;
    } catch {
      continue;
    }
  }
  preview = firstUserMessage;
  const mtime = fileStat.mtimeMs;
  const createdAt = timestampMs(meta.timestamp, mtime);
  const row: ThreadRow = {
    id,
    rollout_path: path,
    created_at: createdAt,
    updated_at: mtime,
    source,
    thread_source: meta.thread_source || null,
    cwd: stringValue(meta.cwd),
    title: "",
    first_user_message: firstUserMessage,
    preview,
    archived: 0,
    git_branch: null,
    git_origin_url: null,
    model: null,
    tokens_used: 0,
  };
  return { row, mtime };
}

async function listRolloutFiles(): Promise<string[]> {
  const root = sessionsDir();
  const result: { path: string; mtime: number }[] = [];
  let years;
  try {
    years = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const year of years.filter((entry) => entry.isDirectory()).sort((a, b) => b.name.localeCompare(a.name))) {
    let months;
    try {
      months = await readdir(join(root, year.name), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const month of months.filter((entry) => entry.isDirectory()).sort((a, b) => b.name.localeCompare(a.name))) {
      let days;
      try {
        days = await readdir(join(root, year.name, month.name), { withFileTypes: true });
      } catch {
        continue;
      }
      for (const day of days.filter((entry) => entry.isDirectory()).sort((a, b) => b.name.localeCompare(a.name))) {
        let files;
        try {
          files = await readdir(join(root, year.name, month.name, day.name), { withFileTypes: true });
        } catch {
          continue;
        }
        for (const file of files.filter((entry) => entry.isFile() && entry.name.endsWith(".jsonl"))) {
          const path = join(root, year.name, month.name, day.name, file.name);
          try {
            result.push({ path, mtime: (await stat(path)).mtimeMs });
          } catch {
            continue;
          }
        }
      }
    }
  }
  return result.sort((a, b) => b.mtime - a.mtime).map((entry) => entry.path);
}

export async function scanRecentRollouts(maxFiles = 300): Promise<ThreadRow[]> {
  const paths = (await listRolloutFiles()).slice(0, Math.max(0, maxFiles));
  const parsed = await Promise.all(paths.map((path) => fileHead(path)));
  return parsed
    .filter((entry): entry is ParsedRollout => entry !== null)
    .sort((a, b) => b.mtime - a.mtime)
    .map(({ row }) => row);
}

export function isCodexHomeConfigured(): boolean {
  return Boolean(getCodexHome());
}
