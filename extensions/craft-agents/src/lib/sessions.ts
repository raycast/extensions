import fs from "node:fs";
import path from "node:path";
import { logger } from "./logger";
import { sessionsDir } from "./workspace";
import { SessionMetaSchema, type SessionRecord } from "./sessions.schema";

const MAX_FIRST_LINE_BYTES = 64 * 1024; // 64 KB — see SECURITY.md rule 4

/**
 * Read the first line of a file, bounded by MAX_FIRST_LINE_BYTES.
 * Returns null if the file can't be read or is empty.
 */
function readFirstLine(filePath: string): string | null {
  try {
    const fd = fs.openSync(filePath, "r");
    try {
      const buf = Buffer.alloc(MAX_FIRST_LINE_BYTES);
      const bytesRead = fs.readSync(fd, buf, 0, MAX_FIRST_LINE_BYTES, 0);
      if (bytesRead === 0) return null;
      const slice = buf.subarray(0, bytesRead).toString("utf8");
      const nl = slice.indexOf("\n");
      return nl === -1 ? slice : slice.slice(0, nl);
    } finally {
      fs.closeSync(fd);
    }
  } catch (err) {
    logger.warn("sessions.read_first_line_failed", { filePath, err: String(err) });
    return null;
  }
}

function parseMeta(line: string): import("./sessions.schema").SessionMeta | null {
  let obj: unknown;
  try {
    obj = JSON.parse(line);
  } catch {
    return null;
  }
  const result = SessionMetaSchema.safeParse(obj);
  return result.success ? result.data : null;
}

function toDate(v: string | number | undefined): Date | undefined {
  if (v === undefined) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function recordFromId(id: string): SessionRecord {
  return { id, displayName: id, labels: [], flagged: false };
}

function hydrate(id: string, line: string | null, folderMTime: Date): SessionRecord {
  if (!line) {
    return { ...recordFromId(id), updatedAt: folderMTime };
  }
  const meta = parseMeta(line);
  if (!meta) {
    logger.debug("sessions.meta_parse_failed", { id });
    return { ...recordFromId(id), updatedAt: folderMTime };
  }
  return {
    id,
    displayName: meta.name ?? meta.title ?? id,
    labels: meta.labels ?? [],
    status: meta.sessionStatus,
    flagged: meta.flagged ?? false,
    updatedAt: toDate(meta.updatedAt as string | number | undefined) ?? folderMTime,
  };
}

/**
 * List all sessions under {workspaceRoot}/sessions/.
 *
 * Does NOT throw for individual malformed sessions — they fall back to folder-id-only.
 * Returns records sorted by updatedAt desc.
 */
export function listSessions(workspaceRoot: string): SessionRecord[] {
  const dir = sessionsDir(workspaceRoot);
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    logger.warn("sessions.readdir_failed", { dir, err: String(err) });
    return [];
  }
  const records: SessionRecord[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const id = entry.name;
    const sessionDir = path.join(dir, id);
    const jsonlPath = path.join(sessionDir, "session.jsonl");
    let folderMTime: Date;
    try {
      folderMTime = fs.statSync(sessionDir).mtime;
    } catch {
      folderMTime = new Date(0);
    }
    let firstLine: string | null = null;
    try {
      if (fs.existsSync(jsonlPath)) {
        firstLine = readFirstLine(jsonlPath);
      }
    } catch (err) {
      logger.debug("sessions.stat_jsonl_failed", { jsonlPath, err: String(err) });
    }
    records.push(hydrate(id, firstLine, folderMTime));
  }
  records.sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0));
  return records;
}
