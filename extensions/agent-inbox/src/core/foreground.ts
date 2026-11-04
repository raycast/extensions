import { CLAUDE_BUNDLE, CLAUDE_BRIDGE_ID, findClaudeDesktopSession, readClaudeDesktopSessions, sameClaudeBridgeId } from "./claude-desktop";
import { CODEX_APP_BUNDLE } from "./adapters/codex";
import { readCodexDesktopSessions } from "./codex-desktop";
import { FocusedWindow, readFocusedWindow } from "./focused-window";
import { fromHistory } from "./merge";
import { bundleFor, frontTty, tmuxClients, TERMINAL_BUNDLES } from "./terminal";
import { Session } from "./types";
import { claudeWindowIdentity } from "./claude-window";

export interface ForegroundContext {
  capturedAt?: number;
  bundleId?: string;
  window?: FocusedWindow;
  tty?: string;
}

/** Capture focus before reading history or the database, which may take time. */
export async function captureForeground(bundleId: string | undefined): Promise<ForegroundContext> {
  const capturedAt = Date.now();
  if (bundleId === CLAUDE_BUNDLE || bundleId === CODEX_APP_BUNDLE)
    return { bundleId, capturedAt, window: await readFocusedWindow(bundleId) };
  return { bundleId, tty: bundleId ? await frontTty(bundleId) : undefined };
}

/** Raycast's close animation can temporarily leave itself frontmost or leave AX without a window. */
export async function captureAfterRaycast(actions: {
  close: () => Promise<void>;
  getBundleId: () => Promise<string | undefined>;
  capture?: typeof captureForeground;
  wait?: (ms: number) => Promise<void>;
}): Promise<ForegroundContext> {
  await actions.close();
  const capture = actions.capture ?? captureForeground;
  const wait = actions.wait ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  for (let attempt = 0; attempt < 6; attempt++) {
    const bundleId = await actions.getBundleId().catch(() => undefined);
    if (bundleId && bundleId !== "com.raycast.macos") {
      const context = await capture(bundleId);
      const desktop = bundleId === CLAUDE_BUNDLE || bundleId === CODEX_APP_BUNDLE;
      if (!desktop || context.window) return context;
    }
    if (attempt < 5) await wait(80);
  }
  return {};
}

function unique(sessions: Session[]): Session | undefined {
  return sessions.length === 1 ? sessions[0] : undefined;
}

const UUID = "([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})";

/** Known conversation routes, not arbitrary UUIDs from sidebar links or file paths. */
function codexDocument(raw: string): { id?: string; hostId?: string; shell: boolean } {
  if (!raw) return { shell: true };
  try {
    const url = new URL(raw);
    if (!["app:", "codex:", "file:"].includes(url.protocol)) return { shell: false };
    const hash = url.hash.replace(/^#\/?/, "/");
    const route = hash || (url.protocol === "codex:" ? `/${url.hostname}${url.pathname}` : url.pathname);
    const [path, query = ""] = route.split("?");
    const id = path.match(new RegExp(`^/(?:threads?|local|hotkey-window/thread)/${UUID}/?$`, "i"))?.[1];
    const hostId = new URLSearchParams(query).get("hostId") || url.searchParams.get("hostId") || undefined;
    return { id, hostId, shell: !hash && /^(?:\/|.*\/index\.html)$/.test(url.pathname) && url.protocol !== "codex:" };
  } catch {
    return { shell: false };
  }
}

function normalizedTitle(title: string): string {
  return title
    .normalize("NFKC")
    .replace(/\s+[-–—]\s+(?:Claude(?: Code)?|Codex|ChatGPT)$/, "")
    .trim()
    .replace(/\s+/g, " ");
}

async function codexSession(window: FocusedWindow, sessions: Session[], readCatalog: typeof readCodexDesktopSessions) {
  const documents = [...new Set([window.url, window.documentUrl].filter((url): url is string => url !== undefined))].map(codexDocument);
  const identities = documents.filter((document) => document.id);
  const ids = new Set(identities.map((document) => document.id));
  if (ids.size > 1 || (!ids.size && documents.some((document) => !document.shell))) return undefined;
  // A CLI-originated session can subsequently be opened in the desktop app. Only the
  // matched window is assigned the desktop host; catalog discovery changes no subscriptions.
  const candidates = new Map(sessions.filter((s) => s.agent === "codex").map((s) => [s.sessionId, s]));
  for (const entry of await readCatalog()) {
    const existing = candidates.get(entry.sessionId);
    candidates.set(entry.sessionId, {
      ...fromHistory(entry),
      ...existing,
      title: entry.title || existing?.title || "",
      transcriptPath: existing?.transcriptPath || entry.transcriptPath,
      cwd: existing?.cwd || entry.cwd,
    });
  }
  const titles = [window.title, window.windowTitle ?? ""]
    .map(normalizedTitle)
    .filter((title) => title && !/^(?:Codex|ChatGPT)$/i.test(title));
  const selected = ids.size
    ? candidates.get([...ids][0]!)
    : unique([...candidates.values()].filter((session) => titles.includes(normalizedTitle(session.title))));
  if (!selected) return undefined;
  const hostIds = [...new Set(identities.map((document) => document.hostId).filter(Boolean))];
  if (hostIds.length > 1) return undefined;
  return { ...selected, host: "app" as const, locator: { ...selected.locator, ...(hostIds[0] ? { hostId: hostIds[0] } : {}) } };
}

/** Match actual window identity. Background activity and lastFocusedAt are not current focus. */
export async function sessionForForeground(
  context: ForegroundContext,
  sessions: Session[],
  actions = { readClaudeDesktopSessions, readCodexDesktopSessions, tmuxClients },
): Promise<Session | undefined> {
  const { bundleId, window, tty } = context;
  if (!bundleId) return undefined;
  if (bundleId === CODEX_APP_BUNDLE) return window ? codexSession(window, sessions, actions.readCodexDesktopSessions) : undefined;
  if (bundleId === CLAUDE_BUNDLE) {
    if (!window) return undefined;
    const desktop = actions.readClaudeDesktopSessions();
    const candidates = sessions.filter((s) => s.agent === "claude" && s.host === "app");
    // Include old desktop sessions even if they fall outside the history scan limit.
    for (const r of desktop) {
      if (r.isArchived || candidates.some((s) => s.locator.claudeDesktopId === r.sessionId)) continue;
      const existing = sessions.find((s) => s.agent === "claude" && s.sessionId === (r.cliSessionId || r.sessionId));
      if (existing && candidates.includes(existing)) candidates.splice(candidates.indexOf(existing), 1);
      candidates.push({
        ...(existing ??
          fromHistory({
            agent: "claude",
            sessionId: r.cliSessionId || r.sessionId,
            host: "app",
            title: r.title,
            cwd: r.cwd,
            summary: "",
            startedAt: r.createdAt,
            updatedAt: r.lastActivityAt,
            transcriptPath: "",
          })),
        host: "app",
        title: r.title || existing?.title || "",
        locator: { ...existing?.locator, claudeDesktopId: r.sessionId },
      });
    }
    const identity = claudeWindowIdentity(window);
    const id = identity?.sessionId;
    if (id) {
      const localId = findClaudeDesktopSession(id, desktop)?.sessionId;
      const matches = candidates.filter(
        (s) =>
          s.sessionId === id ||
          s.locator.claudeDesktopId === id ||
          (localId && s.locator.claudeDesktopId === localId) ||
          sameClaudeBridgeId(s.sessionId, id),
      );
      if (matches.length) {
        const match = unique(matches);
        return match && identity.title ? { ...match, title: identity.title, titleObservedAt: context.capturedAt ?? Date.now() } : match;
      }
      // Preserve ambiguous/archived local mappings; don't manufacture a cloud duplicate.
      if (desktop.some((r) => r.sessionId === id || r.bridgeSessionIds?.some((alias) => sameClaudeBridgeId(alias, id)))) return undefined;
      if (!CLAUDE_BRIDGE_ID.test(id)) return undefined;
      // Cloud-only Code sessions have no local_* metadata or CLI transcript. Save the
      // actual focused identity without guessing state, project or activity timestamps.
      return {
        agent: "claude",
        sessionId: id,
        host: "app",
        title: identity.title || id,
        titleObservedAt: context.capturedAt ?? Date.now(),
        cwd: "",
        summary: "",
        transcriptPath: "",
        locator: {},
        status: "unknown",
        attention: null,
        subscribed: false,
        handledAt: null,
        startedAt: 0,
        updatedAt: 0,
      };
    }
    // A known non-conversation document (home, settings, ordinary Claude chat) must not match by title.
    if (window.url) return undefined;
    if (!/\s+[-–—]\s+Claude Code$/.test(window.title)) return undefined;
    const title = window.title.replace(/\s+[-–—]\s+(?:Claude(?: Code)?|Codex)$/, "").trim();
    if (!title || /^(?:Claude(?: Code)?|Codex)$/.test(title)) return undefined;
    return unique(candidates.filter((s) => s.title === title));
  }

  const cli = sessions.filter((s) => s.host === "cli");
  if (!tty || !(TERMINAL_BUNDLES.has(bundleId) || cli.some((s) => bundleFor(s.locator) === bundleId))) return undefined;
  const sockets = [...new Set(cli.filter((s) => s.locator.tmuxPane).map((s) => s.locator.tmuxSocket))];
  const clients = (await Promise.all(sockets.map((socket) => actions.tmuxClients(socket)))).flat().filter((c) => c.tty === tty);
  if (clients.length)
    return unique(cli.filter((s) => clients.some((c) => s.locator.tmuxPane === c.pane && s.locator.tmuxSocket === c.socket)));
  // No app-wide "most recent" fallback: it can select a different tab or background agent.
  return unique(cli.filter((s) => s.locator.tty === tty && !s.locator.tmuxPane));
}
