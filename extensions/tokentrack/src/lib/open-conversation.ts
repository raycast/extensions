import {
  getApplications,
  open,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { dirname } from "node:path";
import type { ConversationUsageSummary, SourceProviderKey } from "./types";

/**
 * Verified macOS URL schemes (Jun 2026):
 * - Codex: `codex://threads/{session-uuid}` — OpenAI Codex app docs
 * - Claude: `claude://code/{session-uuid}` — Claude mobile/desktop Code tab links
 * - Cursor: no public deeplink to open a local composer by id (cursor-deeplink
 *   handles MCP, BugBot, cloud agents, prompts — not local composerId)
 */
const APP_BUNDLES: Record<SourceProviderKey, string> = {
  claude: "com.anthropic.claudefordesktop",
  codex: "com.openai.codex",
  cursor: "com.todesktop.230313mzl4w4u92",
};

/** Matches `src/lib/sources/codex.ts` — rollout filename trailing UUID. */
const CODEX_ROLLOUT_ID_RE =
  /-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i;

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
  const path = summary.sourcePath ?? summary.key;
  const base = path.split("/").pop() ?? "";
  if (!base.endsWith(".jsonl")) return undefined;
  return base.replace(/\.jsonl$/i, "");
}

function codexSessionId(summary: ConversationUsageSummary): string | undefined {
  const path = summary.sourcePath ?? summary.key;
  return CODEX_ROLLOUT_ID_RE.exec(path)?.[1];
}

async function isAppInstalled(bundleId: string): Promise<boolean> {
  const apps = await getApplications();
  return apps.some((app) => app.bundleId === bundleId);
}

async function openDeeplink(url: string, bundleId: string): Promise<void> {
  await open(url, bundleId);
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
      await openDeeplink(`codex://threads/${sessionId}`, bundleId);
      return { ok: true };
    }

    if (provider === "claude") {
      const path = summary.sourcePath ?? summary.key;
      const sessionId = claudeSessionId(summary);
      const bundleId = APP_BUNDLES.claude;
      const appInstalled = await isAppInstalled(bundleId);

      if (sessionId && appInstalled) {
        try {
          await openDeeplink(`claude://code/${sessionId}`, bundleId);
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
