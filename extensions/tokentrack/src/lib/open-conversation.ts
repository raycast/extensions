import {
  getApplications,
  open,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { CLAUDE_DATA_PATH } from "./source-paths";
import { expandHome } from "./sources/shared";
import type { ConversationUsageSummary, SourceProviderKey } from "./types";

/**
 * Verified macOS URL schemes (Jun 2026):
 * - Codex: `codex://threads/{session-uuid}` — OpenAI Codex app docs
 * - Claude Desktop Code: `claude://resume?session={uuid}&cwd={path}` opens the
 *   session; `claude://code/{uuid}` opens the Code tab (may not jump to session)
 * - Cursor: no public deeplink to open a local composer by id
 */
const APP_BUNDLES: Record<SourceProviderKey, string> = {
  claude: "com.anthropic.claudefordesktop",
  codex: "com.openai.codex",
  cursor: "com.todesktop.230313mzl4w4u92",
};

/** Matches `src/lib/sources/codex.ts` — rollout filename trailing UUID. */
const CODEX_ROLLOUT_ID_RE =
  /-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i;

const CLAUDE_SESSION_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CLAUDE_PROJECT_CWD_RE = /\/\.claude\/projects\/([^/]+)\//;

export type OpenConversationResult = { ok: boolean; reason?: string };

/** Cursor has deeplinks for prompts/MCP/BugBot, but not to open a local chat by composerId. */
export const CURSOR_OPEN_CHAT_TOOLTIP =
  "Opens Cursor. Cannot jump to this chat yet (no composer deeplink)";

export function openConversationTitle(provider: SourceProviderKey): string {
  return provider === "cursor" ? "Open Cursor" : "Open Chat";
}

export function openConversationTooltip(
  provider: SourceProviderKey,
): string | undefined {
  return provider === "cursor" ? CURSOR_OPEN_CHAT_TOOLTIP : undefined;
}

function claudeSessionId(
  summary: ConversationUsageSummary,
): string | undefined {
  if (summary.key.startsWith("claude:")) {
    const id = summary.key.slice("claude:".length);
    if (CLAUDE_SESSION_ID_RE.test(id)) return id;
  }

  const path = summary.sourcePath ?? summary.key;
  const base = path.split("/").pop() ?? "";
  if (!base.endsWith(".jsonl")) return undefined;
  const id = base.replace(/\.jsonl$/i, "");
  return CLAUDE_SESSION_ID_RE.test(id) ? id : undefined;
}

/** `projects/-Users-foo-bar/` → `/Users/foo/bar`. */
function claudeCwdFromSourcePath(sourcePath: string): string | undefined {
  const encoded = CLAUDE_PROJECT_CWD_RE.exec(sourcePath)?.[1];
  if (!encoded?.startsWith("-")) return undefined;
  return `/${encoded.slice(1).replace(/-/g, "/")}`;
}

function loadClaudeSessionCwd(sessionId: string): string | undefined {
  const sessionsDir = join(expandHome(CLAUDE_DATA_PATH), "sessions");
  if (!existsSync(sessionsDir)) return undefined;

  for (const name of readdirSync(sessionsDir)) {
    if (!name.endsWith(".json")) continue;
    try {
      const row = JSON.parse(readFileSync(join(sessionsDir, name), "utf8")) as {
        sessionId?: string;
        cwd?: string;
      };
      if (row.sessionId === sessionId && typeof row.cwd === "string") {
        return row.cwd;
      }
    } catch {
      // optional registry
    }
  }
  return undefined;
}

function resolveClaudeSessionCwd(
  sessionId: string,
  sourcePath?: string,
): string | undefined {
  return (
    loadClaudeSessionCwd(sessionId) ??
    (sourcePath ? claudeCwdFromSourcePath(sourcePath) : undefined)
  );
}

function codexSessionId(summary: ConversationUsageSummary): string | undefined {
  const path = summary.sourcePath ?? summary.key;
  return CODEX_ROLLOUT_ID_RE.exec(path)?.[1];
}

async function isAppInstalled(bundleId: string): Promise<boolean> {
  const apps = await getApplications();
  return apps.some((app) => app.bundleId === bundleId);
}

function claudeDeepLinks(sessionId: string, cwd?: string): string[] {
  const links: string[] = [];
  if (cwd) {
    const resume = new URL("claude://resume");
    resume.searchParams.set("session", sessionId);
    resume.searchParams.set("cwd", cwd);
    links.push(resume.toString());
  }
  links.push(`claude://code/${sessionId}`);
  return links;
}

async function openClaudeSession(
  sessionId: string,
  cwd: string | undefined,
  bundleId: string,
): Promise<void> {
  const links = claudeDeepLinks(sessionId, cwd);
  let lastError: unknown;

  for (const link of links) {
    try {
      // Let Launch Services route the URL; forcing bundleId can foreground the
      // app without handing off the session path.
      await open(link);
      return;
    } catch (error) {
      lastError = error;
      try {
        await open(link, bundleId);
        return;
      } catch (bundleError) {
        lastError = bundleError;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to open Claude session");
}

export async function openConversation(
  provider: SourceProviderKey,
  summary: ConversationUsageSummary,
): Promise<OpenConversationResult> {
  try {
    if (provider === "cursor") {
      const bundleId = APP_BUNDLES.cursor;
      if (!(await isAppInstalled(bundleId))) {
        return { ok: false, reason: "Cursor is not installed" };
      }
      await open("cursor://", bundleId);
      return {
        ok: true,
        reason: "Cursor opened. Find this chat in Previous Chats",
      };
    }
    if (provider === "codex") {
      const sessionId = codexSessionId(summary);
      if (!sessionId) {
        return { ok: false, reason: "Could not determine Codex thread ID" };
      }
      const bundleId = APP_BUNDLES.codex;
      if (!(await isAppInstalled(bundleId))) {
        return { ok: false, reason: "Codex app is not installed" };
      }
      await open(`codex://threads/${sessionId}`, bundleId);
      return { ok: true };
    }

    if (provider === "claude") {
      const path = summary.sourcePath ?? summary.key;
      const sessionId = claudeSessionId(summary);
      const bundleId = APP_BUNDLES.claude;
      const appInstalled = await isAppInstalled(bundleId);

      if (sessionId && appInstalled) {
        try {
          const cwd = resolveClaudeSessionCwd(sessionId, path);
          await openClaudeSession(sessionId, cwd, bundleId);
          return { ok: true };
        } catch {
          // Desktop may not route to the session — fall back to Finder.
        }
      }

      if (path.endsWith(".jsonl")) {
        await showInFinder(dirname(path));
        return {
          ok: true,
          reason: "Opened in Finder. Open session in Claude",
        };
      }

      if (!appInstalled) {
        return { ok: false, reason: "Claude app is not installed" };
      }
      return { ok: false, reason: "No session file path available" };
    }

    return { ok: false, reason: "Unsupported provider" };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to open chat";
    return { ok: false, reason: message };
  }
}

export async function runOpenConversation(
  provider: SourceProviderKey,
  summary: ConversationUsageSummary,
): Promise<void> {
  const result = await openConversation(provider, summary);
  if (result.ok) {
    if (result.reason) {
      await showToast({
        style: Toast.Style.Success,
        title: result.reason,
      });
    }
    return;
  }
  await showToast({
    style: Toast.Style.Failure,
    title: "Could not open chat",
    message: result.reason,
  });
}
