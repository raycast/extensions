import { posix } from "node:path";

/**
 * Turns `autorag lite retrieve --json` output into list items. The CLI returns ranked chunks; a list shows one row
 * per file, mail, chat message or page (its best-ranked chunk), labelled from the datasource's own metadata.
 */

export type HitKind = "file" | "mail" | "chat" | "web" | "other";

export interface Hit {
  /** Stable per file / message / page: the list's React key and the dedupe key. */
  readonly key: string;
  readonly kind: HitKind;
  readonly title: string;
  readonly subtitle: string;
  /** The chunk's text. */
  readonly content: string;
  /** The CLI's source id, as printed (a real path for files, a virtual one for datasources). */
  readonly source: string;
  readonly method: string;
  /** Files only: the absolute path on disk. */
  readonly path?: string;
  /** Files only: section and line, when the chunk has them. */
  readonly location?: string;
  /** Web pages only. */
  readonly url?: string;
  readonly date?: Date;
}

export type RetrieveResult =
  | {
      readonly ok: true;
      readonly stale: boolean;
      readonly hits: readonly Hit[];
      readonly unsearched: readonly string[];
      /** Why each of those sources was skipped, as the CLI reported it. */
      readonly unsearchedReasons: readonly { readonly surface: string; readonly reason: string }[];
    }
  | { readonly ok: false; readonly error: string };

interface RawResult {
  readonly source?: unknown;
  readonly method?: unknown;
  readonly metadata?: Record<string, unknown>;
  readonly content?: unknown;
}

const MAIL_DATASOURCES: Record<string, true> = { mailcrawl: true, gmail: true, mail: true };
const CHAT_DATASOURCES: Record<string, true> = {
  kakao: true,
  slack: true,
  telegram: true,
  whatsapp: true,
  discord: true,
  nomadamas: true,
  imessage: true,
  line: true,
};

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

/** A date from ISO text, epoch milliseconds, or epoch seconds (Slack's `1786522194.283659`, Telegram's `1771512266`). */
function dateOf(...values: unknown[]): Date | undefined {
  for (const value of values) {
    let date: Date | undefined;
    if (typeof value === "number" && Number.isFinite(value)) date = new Date(value < 1e12 ? value * 1000 : value);
    else if (typeof value === "string" && value.trim().length > 0) {
      const trimmed = value.trim();
      if (/^\d+(\.\d+)?$/u.test(trimmed)) {
        const n = Number(trimmed);
        date = new Date(n < 1e12 ? n * 1000 : n);
      } else {
        // Go's RFC 3339 with nanoseconds: JavaScript takes milliseconds only.
        date = new Date(trimmed.replace(/(\.\d{3})\d+/u, "$1"));
      }
    }
    if (date !== undefined && !Number.isNaN(date.getTime())) return date;
  }
  return undefined;
}

/** `~/…` for a folder under the home directory, the folder itself otherwise. */
function displayFolder(path: string, home: string): string {
  const folder = posix.dirname(path);
  if (home.length > 0 && (folder === home || folder.startsWith(`${home}/`))) return `~${folder.slice(home.length)}`;
  return folder;
}

function fileHit(source: string, method: string, meta: Record<string, unknown>, content: string, home: string): Hit {
  const section = text(meta.section);
  const line = typeof meta.lineNumber === "number" ? `line ${meta.lineNumber}` : undefined;
  const location = [section, line].filter((part) => part !== undefined).join(" · ");
  return {
    key: `file:${source}`,
    kind: "file",
    title: posix.basename(source),
    subtitle: displayFolder(source, home),
    path: source,
    ...(location.length > 0 ? { location } : {}),
    content,
    source,
    method,
  };
}

function datasourceHit(source: string, method: string, meta: Record<string, unknown>, content: string): Hit {
  const datasource = text(meta.datasourceId) ?? method.replace(/-(hybrid|lexical|semantic|bm25|fts)$/u, "");
  const base = { content, source, method };
  if (MAIL_DATASOURCES[datasource] === true) {
    const date = dateOf(meta.date, meta.publishedAt);
    return {
      ...base,
      key: `mail:${text(meta.messageId) ?? source}`,
      kind: "mail",
      title: text(meta.subject) ?? "(no subject)",
      subtitle: text(meta.from) ?? datasource,
      ...(date ? { date } : {}),
    };
  }
  if (datasource === "browser" || text(meta.url) !== undefined) {
    const url = text(meta.url);
    const date = dateOf(meta.visitedAt, meta.publishedAt);
    return {
      ...base,
      key: `web:${url ?? source}`,
      kind: "web",
      title: text(meta.title) ?? url ?? source,
      subtitle: text(meta.domain) ?? datasource,
      ...(url ? { url } : {}),
      ...(date ? { date } : {}),
    };
  }
  if (
    CHAT_DATASOURCES[datasource] === true ||
    text(meta.chatName) !== undefined ||
    text(meta.channelName) !== undefined
  ) {
    const date = dateOf(meta.publishedAt, meta.timestamp, meta.startedAt);
    return {
      ...base,
      key: `chat:${source}`,
      kind: "chat",
      title: text(meta.chatName) ?? text(meta.channelName) ?? text(meta.title) ?? datasource,
      subtitle: text(meta.senderNickname) ?? text(meta.senderName) ?? text(meta.authorName) ?? datasource,
      ...(date ? { date } : {}),
    };
  }
  const date = dateOf(meta.publishedAt, meta.date, meta.timestamp);
  return {
    ...base,
    key: `other:${source}`,
    kind: "other",
    title: text(meta.title) ?? posix.basename(source),
    subtitle: datasource,
    ...(date ? { date } : {}),
  };
}

export function parseRetrieveOutput(stdout: string, home: string): RetrieveResult {
  const trimmed = stdout.trim();
  if (trimmed.length === 0) return { ok: false, error: "Dazzi returned no results" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: trimmed.split("\n")[0] ?? trimmed };
  }
  if (typeof parsed !== "object" || parsed === null) return { ok: false, error: "Dazzi returned no results" };
  const body = parsed as { ok?: unknown; error?: unknown; stale?: unknown; results?: unknown; unsearched?: unknown };
  if (body.ok !== true) return { ok: false, error: text(body.error) ?? "Dazzi search failed" };
  const hits: Hit[] = [];
  const seen = new Set<string>();
  for (const raw of Array.isArray(body.results) ? (body.results as RawResult[]) : []) {
    const source = text(raw.source);
    if (source === undefined) continue;
    const method = text(raw.method) ?? "";
    const meta = raw.metadata ?? {};
    const content = typeof raw.content === "string" ? raw.content : "";
    // A real file path is absolute and is not one of the datasources' virtual `/name/instance/...` ids.
    const isFile =
      method.startsWith("minsync") ||
      method.startsWith("parsed") ||
      (meta.datasourceId === undefined && text(meta.virtualPath) !== undefined);
    const hit = isFile ? fileHit(source, method, meta, content, home) : datasourceHit(source, method, meta, content);
    if (seen.has(hit.key)) continue;
    seen.add(hit.key);
    hits.push(hit);
  }
  const unsearchedReasons: { surface: string; reason: string }[] = [];
  for (const entry of Array.isArray(body.unsearched)
    ? (body.unsearched as { surface?: unknown; reason?: unknown }[])
    : []) {
    const surface = text(entry.surface);
    if (surface !== undefined) unsearchedReasons.push({ surface, reason: text(entry.reason) ?? "" });
  }
  return {
    ok: true,
    stale: body.stale === true,
    hits,
    unsearched: unsearchedReasons.map((entry) => entry.surface),
    unsearchedReasons,
  };
}
