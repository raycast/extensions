// Claude desktop. Code sessions come from Claude's own session files and open with the claude:// deep link
// that Claude's Dock menu and Spotlight entries use, so they're listed whether or not the sidebar is visible
// (ADR-014). Chat and Cowork conversations aren't stored locally: they're read from the sidebar, and each one's
// id is learned from the page URL while it's open, so it can then open by deep link, sidebar or not (ADR-017).

import { tildify } from "../applescript";
import type { App, Platform, Tab, TabSource, WebPage } from "../model";
import { openSidebarEntry, readSidebar, type SidebarRef, type SidebarSpec } from "./sidebar";
import { windows } from "./windows";

const BUNDLE_ID = "com.anthropic.claudefordesktop";

/** <account>/<org>/local_<uuid>.json, one file per Code session. */
export const SESSIONS_DIR = "Library/Application Support/Claude/claude-code-sessions";
export const SESSION_FILE = /^local_[\w-]+\.json$/;
/** What the tab list needs of a session file; the rest (mostly MCP config, ~400 KB) is dropped as each file is read. */
const SESSION_FIELDS = ["sessionId", "isArchived", "cwd", "title", "lastFocusedAt"];

/** Rows titled "<status> <name>" (status: Running, Idle, a PR badge...); the open session or chat is named by
 * a "<name>, rename session" button above the transcript, which is there even with the sidebar hidden. */
const SIDEBAR: SidebarSpec = {
  id: "claude",
  bundleId: BUNDLE_ID,
  kind: "session",
  container: "Sidebar",
  rowRole: "AXButton",
  format: "status-prefixed",
  activeSuffix: ", rename session",
};

/** A conversation's path on claude.ai, opened in the app as claude://claude.ai/<path>. */
type ConversationRef = { path: string };
type Ref = { sessionId: string } | ConversationRef | SidebarRef;

/** Conversations whose id was seen; most recently seen first. Titles can repeat (two chats both named "Trip"). */
export interface KnownConversation {
  title: string;
  path: string;
  seenAt: number;
}

const KNOWN_KEY = "tabs:claude-conversations";
const MAX_KNOWN = 200;
/** How many known conversations to list when the sidebar shows none (hidden, or in Code mode). */
const MAX_LISTED = 20;
const CONVERSATION_URL = /^https:\/\/claude\.ai\/(chat\/[0-9a-f-]{36}|cowork\/cse_[A-Za-z0-9]+)(?:[/?#]|$)/;

export interface CodeSession {
  sessionId: string;
  title: string;
  cwd: string;
  lastFocusedAt: number;
}

/** A session file's fields, or undefined for archived or unexpected files. */
export function parseSession(data: Record<string, unknown>): CodeSession | undefined {
  if (typeof data.sessionId !== "string" || data.isArchived === true) return undefined;
  const cwd = typeof data.cwd === "string" ? data.cwd : "";
  return {
    sessionId: data.sessionId,
    title: (typeof data.title === "string" && data.title) || cwd.split("/").pop() || "Code session",
    cwd,
    lastFocusedAt: typeof data.lastFocusedAt === "number" ? data.lastFocusedAt : 0,
  };
}

/** Tab key of a Code session; the agent level points its Claude Code agents at it. */
export const codeSessionKey = (bundleId: string, sessionId: string) => `${bundleId}:code:${sessionId}`;

/** Deep link that opens a Code session in the app (what Claude's Dock menu uses; ADR-014). */
export const codeSessionUrl = (sessionId: string) => `claude://code/continue?session=${encodeURIComponent(sessionId)}`;

/** Most recently focused first; `activeTitle` (the open session) marks one as active. */
export function fromSessions(app: App, sessions: CodeSession[], activeTitle?: string): Tab<Ref>[] {
  return [...sessions]
    .sort((a, b) => b.lastFocusedAt - a.lastFocusedAt)
    .map((s) => ({
      key: codeSessionKey(app.bundleId, s.sessionId),
      app,
      source: claude.id,
      kind: "session",
      title: s.title,
      detail: tildify(s.cwd) || undefined,
      active: s.title === activeTitle,
      ref: { sessionId: s.sessionId },
    }));
}

/** The conversation open in Claude, from its page ("<title> - Claude" at claude.ai/chat/<uuid>). */
export function openConversation(page: WebPage | undefined): Omit<KnownConversation, "seenAt"> | undefined {
  const path = page && CONVERSATION_URL.exec(page.url)?.[1];
  const title = page?.title.replace(/ - Claude$/, "").trim();
  return path && title ? { title, path } : undefined;
}

/** `known` with `seen` first (replacing the entry with its path: a renamed conversation), capped. */
export function remember(
  known: KnownConversation[],
  seen: Omit<KnownConversation, "seenAt">,
  now: number,
): KnownConversation[] {
  const rest = known.filter((k) => k.path !== seen.path);
  return [{ ...seen, seenAt: now }, ...rest].slice(0, MAX_KNOWN);
}

/** Key of the `n`th (0-based) conversation titled `title`, the same whether it's listed from the sidebar or not. */
const conversationKey = (app: App, title: string, n: number) =>
  `${app.bundleId}:row:${title}${n > 0 ? `#${n + 1}` : ""}`;

/** Calls `f` with each item and how many before it had the same title. */
function byOccurrence<T extends { title: string }, U>(items: T[], f: (item: T, n: number) => U): U[] {
  const counts = new Map<string, number>();
  return items.map((item) => {
    const n = counts.get(item.title) ?? 0;
    counts.set(item.title, n + 1);
    return f(item, n);
  });
}

async function readSessions(platform: Platform): Promise<CodeSession[]> {
  const files = await platform.readJsonFields(`${platform.homeDir()}/${SESSIONS_DIR}`, SESSION_FILE, 3, SESSION_FIELDS);
  return files.flatMap((f) => parseSession(f.fields) ?? []);
}

export const claude: TabSource<Ref> = {
  id: "claude",
  bundleIds: [BUNDLE_ID],
  list: async (app, platform) => {
    const [sessions, sidebar, pages, stored] = await Promise.all([
      readSessions(platform),
      readSidebar(app, SIDEBAR, platform),
      platform.webPages(app.bundleId),
      platform.loadJson<KnownConversation[]>(KNOWN_KEY, []),
    ]);
    const current = pages.map(openConversation).find((c) => c !== undefined);
    const known = current ? remember(stored, current, Date.now()) : stored;
    if (current) await platform.saveJson(KNOWN_KEY, known);
    const active =
      sidebar.find((t) => t.active)?.title ??
      current?.title ??
      (await platform.labelWithSuffix(app.bundleId, SIDEBAR.activeSuffix!));
    const code = fromSessions(app, sessions, active);
    // In Code mode the sidebar repeats the sessions; in Chat mode it adds conversations the files don't have,
    // opened by deep link when their id is known. Rows have only titles: the n-th row with a title takes the n-th
    // most recently seen conversation with it (the sidebar lists the most recent first). A repeated title with no
    // known conversation left is left out: opening its row by name would open the first one.
    const titles = new Set(code.map((t) => t.title));
    const pathsByTitle = new Map<string, string[]>();
    for (const k of known) pathsByTitle.set(k.title, [...(pathsByTitle.get(k.title) ?? []), k.path]);
    const extra = byOccurrence(
      sidebar.filter((t) => !titles.has(t.title)),
      (t, n): Tab<Ref>[] => {
        const path = pathsByTitle.get(t.title)?.[n];
        const isActive = current ? path === current.path : t.active && n === 0;
        if (path) return [{ ...t, key: conversationKey(app, t.title, n), active: isActive, ref: { path } }];
        return n === 0 ? [t] : [];
      },
    ).flat();
    // No conversations in the sidebar (hidden, or Code mode): list the ones seen lately.
    const recent =
      extra.length > 0
        ? []
        : byOccurrence(known.filter((k) => !titles.has(k.title)).slice(0, MAX_LISTED), (k, n): Tab<Ref> => ({
            key: conversationKey(app, k.title, n),
            app,
            source: claude.id,
            kind: "session",
            title: k.title,
            active: k.path === current?.path || (!current && k.title === active && n === 0),
            ref: { path: k.path },
          }));
    const tabs = [...code, ...extra, ...recent];
    return tabs.length > 0 ? tabs : ((await windows.list(app, platform)) as Tab[] as Tab<Ref>[]);
  },
  select: async (tab, platform) => {
    if ("sessionId" in tab.ref) {
      await platform.openUrl(codeSessionUrl(tab.ref.sessionId));
    } else if ("path" in tab.ref) {
      await platform.openUrl(`claude://claude.ai/${tab.ref.path}`);
    } else {
      await openSidebarEntry(tab as Tab<SidebarRef>, SIDEBAR, platform);
    }
  },
};
