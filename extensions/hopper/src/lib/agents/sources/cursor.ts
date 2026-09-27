// Cursor agents (composers), from Cursor's own state database: its header list has each agent's folder and the
// flags Cursor's UI uses (blocking pending actions, unread messages); each agent's record has its run status
// (generating / completed / aborted). Cursor 3.15 saves a running agent as "aborted" (so a crash leaves it
// that way) and "completed" at the end, so an aborted agent is working while its transcript's last turn hasn't
// ended. Jumping opens the agent in Cursor's Agents window through Cursor's own
// deep link; opening the folder instead opened an extra editor window (ADR-026). Only read while Cursor runs:
// its agents don't run otherwise.

import type { Agent, AgentContext, AgentSource, AgentStatus } from "../model";

const BUNDLE_ID = "com.todesktop.230313mzl4w4u92";
const AGENT_LINK = "cursor://anysphere.cursor-deeplink/agent?id=";
const DB = "Library/Application Support/Cursor/User/globalStorage/state.vscdb";
/** Enough of a transcript's end to hold its last line (tool results can be long). */
const TAIL_BYTES = 64 * 1024;
/** Idle agents older than this aren't listed: the list is for what's going on now. */
const IDLE_WINDOW_MS = 24 * 60 * 60 * 1000;

/** No lastUpdatedAt: an agent never sent a message (empty new agents), so it isn't listed. */
const FIELDS = `json_extract(h, '$.composerId') as id,
  json_extract(h, '$.name') as name,
  json_extract(h, '$.isArchived') as archived,
  json_extract(h, '$.isDraft') as draft,
  json_extract(h, '$.hasUnreadMessages') as unread,
  json_extract(h, '$.hasBlockingPendingActions') as blocking,
  json_extract(h, '$.lastUpdatedAt') as updatedAt,
  json_extract(h, '$.workspaceIdentifier.uri.fsPath') as folder`;

/** Cursor 3.15+ keeps one header per row (subagents are their parent's, so left out); the old blob stops updating. */
const HEADERS = `select ${FIELDS} from (select value as h from composerHeaders where isSubagent = 0)`;

/** Before 3.15: all headers in one JSON blob. */
const LEGACY_HEADERS = `select ${FIELDS} from (select e.value as h
  from ItemTable, json_each(json_extract(ItemTable.value, '$.allComposers')) e
  where ItemTable.key = 'composer.composerHeaders')`;

const statusQuery = (ids: string[]) =>
  `select substr(key, 14) as id, json_extract(value, '$.status') as status from cursorDiskKV
where key in (${ids.map((id) => `'composerData:${id.replace(/'/g, "''")}'`).join(",")})`;

export interface Header {
  id: string;
  name?: string;
  archived: boolean;
  draft: boolean;
  unread: boolean;
  blocking: boolean;
  updatedAt?: number;
  folder?: string;
}

export function parseHeaders(rows: Record<string, unknown>[]): Header[] {
  return rows.flatMap((r): Header[] =>
    typeof r.id === "string"
      ? [
          {
            id: r.id,
            name: typeof r.name === "string" && r.name ? r.name : undefined,
            archived: r.archived === 1,
            draft: r.draft === 1,
            unread: r.unread === 1,
            blocking: r.blocking === 1,
            updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : undefined,
            folder: typeof r.folder === "string" && r.folder ? r.folder : undefined,
          },
        ]
      : [],
  );
}

/** Blocked while Cursor waits on the user, working while generating, done while it has unread messages. */
export function statusOf(header: Header, runStatus: string | undefined): AgentStatus {
  if (header.blocking) return "blocked";
  if (runStatus === "generating") return "working";
  if (header.unread) return "done";
  return "idle";
}

/** Where Cursor writes an agent's transcript: its folder with every other character than a letter or digit as "-". */
export function transcriptPath(home: string, folder: string, id: string): string {
  const project = folder.replace(/^\/+/, "").replace(/[^A-Za-z0-9]/g, "-");
  return `${home}/.cursor/projects/${project}/agent-transcripts/${id}/${id}.jsonl`;
}

/** Whether a transcript's last line is something other than the end of a turn. */
export function turnOpen(tail: string): boolean {
  const last = tail.trimEnd().split("\n").pop();
  if (!last) return false;
  try {
    return JSON.parse(last)?.type !== "turn_ended";
  } catch {
    return false;
  }
}

export function toAgents(headers: Header[], runStatus: Map<string, string>, now: number): Agent[] {
  return headers.flatMap((h): Agent[] => {
    if (h.archived || h.draft || !h.folder) return [];
    const status = statusOf(h, runStatus.get(h.id));
    if (status === "idle" && (h.updatedAt === undefined || now - h.updatedAt > IDLE_WINDOW_MS)) return [];
    const folderName = h.folder.split("/").pop() ?? h.folder;
    return [
      {
        key: `cursor:${h.id}`,
        source: cursor.id,
        product: "Cursor",
        id: h.id,
        title: h.name ?? "Cursor agent",
        cwd: h.folder,
        status,
        statusDetail: status === "blocked" ? "Needs input" : undefined,
        since: h.updatedAt,
        activeAt: h.updatedAt,
        // Cursor's own unread flag already says whether it was seen.
        seenAt: status === "done" ? 0 : h.updatedAt,
        host: {
          kind: "link",
          bundleId: BUNDLE_ID,
          url: AGENT_LINK + encodeURIComponent(h.id),
          label: `Cursor › ${folderName}`,
        },
      },
    ];
  });
}

export const cursor: AgentSource = {
  id: "cursor",
  list: async ({ platform, apps, now }: AgentContext) => {
    if (!apps.some((a) => a.bundleId === BUNDLE_ID)) return [];
    const db = `${platform.homeDir()}/${DB}`;
    // No composerHeaders table (Cursor before 3.15) fails the query.
    const rows = await platform.querySqlite(db, HEADERS).catch(() => platform.querySqlite(db, LEGACY_HEADERS));
    const headers = parseHeaders(rows).filter((h) => !h.archived && !h.draft);
    if (headers.length === 0) return [];
    const statuses = await platform.querySqlite(db, statusQuery(headers.map((h) => h.id)));
    const runStatus = new Map(statuses.map((r) => [String(r.id), String(r.status ?? "")]));
    const home = platform.homeDir();
    await Promise.all(
      headers
        .filter((h) => runStatus.get(h.id) === "aborted" && h.folder && now - (h.updatedAt ?? 0) <= IDLE_WINDOW_MS)
        .map(async (h) => {
          const tail = await platform.readTail(transcriptPath(home, h.folder!, h.id), TAIL_BYTES).catch(() => "");
          if (turnOpen(tail)) runStatus.set(h.id, "generating");
        }),
    );
    return toAgents(headers, runStatus, now);
  },
};
