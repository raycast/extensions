import { findTranscript } from "../sources/locate";
import { readClaudeTitles } from "../sources/claude-titles";
import { claudeTranscript, questionIds } from "../sources/transcripts";
import { existsSync, readFileSync } from "node:fs";
import { CLAUDE_DIR, CLAUDE_SETTINGS, CLAUDE_PROJECTS } from "../paths";
import { shQuote } from "../exec";
import { activateBundle } from "../terminal";
import { copyToClipboard, jumpToCli, openUrl } from "../jump";
import {
  CLAUDE_BUNDLE,
  CLAUDE_BRIDGE_ID,
  CLAUDE_LOCAL_ID,
  enrichClaudeSessions,
  findClaudeDesktopSession,
  readClaudeDesktopSessions,
} from "../claude-desktop";
import { asksForInput } from "../status";
import { lastClaudeAssistant, parseClaude, parseLines, readHeadTail } from "../transcript";
import { AgentEvent, Attention, Config, Host, Session } from "../types";
import { hookIdentity, requestIds, questionTool, isAsyncAcknowledgement } from "./events";
import { Adapter, DetectResult, HookContext, InstallPlan, JumpResult } from "./types";
import { hasOurHooks, HookEntry, parseJsonFile, stringify, withOurHooks, withoutOurHooks } from "./json";

export const CLAUDE_APP_BUNDLE = CLAUDE_BUNDLE;
const CLAUDE_APP_PATHS = ["/Applications/Claude.app"];

/** Events this adapter listens to. PostToolUse only moves "needs permission" back to "running". */
export const CLAUDE_EVENTS = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PermissionRequest",
  "PostToolUse",
  "PostToolUseFailure",
  "Notification",
  "Stop",
  "StopFailure",
  "SessionEnd",
] as const;

function read(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function hookEntries(ctx: HookContext): Record<string, HookEntry> {
  const command = `${shQuote(ctx.node)} ${shQuote(ctx.cli)} hook claude`;
  const out: Record<string, HookEntry> = {};
  for (const ev of CLAUDE_EVENTS) out[ev] = { hooks: [{ type: "command", command, timeout: 5 }] };
  return out;
}

const s = (v: unknown): string => (typeof v === "string" ? v : "");

function hostFromEnv(env: NodeJS.ProcessEnv, transcriptPath: string): { host?: Host; entrypoint?: string } {
  const entry = env.CLAUDE_CODE_ENTRYPOINT ?? "";
  // An explicit CLI entrypoint wins over an inherited desktop bundle identifier.
  if (entry) return { host: /desktop/i.test(entry) ? "app" : "cli", entrypoint: entry };
  if (transcriptPath) {
    try {
      const { head, tail } = readHeadTail(transcriptPath);
      const info = parseClaude(parseLines(head), parseLines(tail));
      if (info.entrypoint) return { host: /desktop/i.test(info.entrypoint) ? "app" : "cli", entrypoint: info.entrypoint };
    } catch {
      // No transcript yet at SessionStart; preserve the prior host if no other signal exists.
    }
  }
  if (env.__CFBundleIdentifier === CLAUDE_APP_BUNDLE) return { host: "app" };
  return {};
}

function attentionFor(type: string, message: string): Attention | null {
  if (type === "idle_prompt" || type === "auth_success") return null;
  if (type === "permission_prompt" || /permission/i.test(message)) return "permission";
  if (type === "elicitation_dialog") return "question";
  if (/usage limit|rate limit|quota/i.test(message)) return "quota";
  // Older Claude Code versions send no type; "waiting for your input" is the idle reminder.
  if (!type && /waiting for your input/i.test(message)) return null;
  return "input";
}

export function parseClaudeHook(payload: Record<string, unknown>, env: NodeJS.ProcessEnv, now = Date.now()): AgentEvent | null {
  const sessionId = s(payload.session_id);
  const name = s(payload.hook_event_name);
  if (!sessionId || !name) return null;
  const source = hostFromEnv(env, s(payload.transcript_path));
  const base = {
    agent: "claude",
    sessionId,
    host: source.host,
    locator: source.entrypoint ? { claudeEntrypoint: source.entrypoint } : undefined,
    cwd: s(payload.cwd),
    transcriptPath: s(payload.transcript_path),
    at: now,
    ...hookIdentity(payload, now),
  };
  switch (name) {
    case "SessionStart":
      return { ...base, type: "started" };
    case "UserPromptSubmit":
      return { ...base, type: "progress", title: s(payload.prompt) };
    case "PreToolUse":
      return questionTool(s(payload.tool_name))
        ? {
            ...base,
            type: "needs_input",
            attention: "question",
            requestIds: questionIds(requestIds(payload)[0] ?? "", s(payload.tool_name), payload.tool_input),
          }
        : { ...base, type: "tool" };
    case "PermissionRequest":
      return {
        ...base,
        type: "needs_input",
        attention: questionTool(s(payload.tool_name)) ? "question" : "permission",
        requestIds: questionIds(requestIds(payload)[0] ?? "", s(payload.tool_name), payload.tool_input),
      };
    case "PostToolUse":
      return {
        ...base,
        type: "tool",
        requestIds: isAsyncAcknowledgement(payload.tool_response)
          ? []
          : questionIds(requestIds(payload)[0] ?? "", s(payload.tool_name), payload.tool_input),
      };
    case "PostToolUseFailure":
      // A failed tool may be retried by the agent. Its approval/question is no longer pending.
      return { ...base, type: "tool", requestIds: requestIds(payload), summary: s(payload.error) };
    case "Notification": {
      const message = s(payload.message);
      const attention = attentionFor(s(payload.notification_type), message);
      if (!attention) return null;
      return { ...base, type: attention === "quota" ? "quota" : "needs_input", attention, summary: message };
    }
    case "Stop":
    case "SubagentStop": {
      if (name === "SubagentStop") return null;
      const last = s(payload.last_assistant_message) || (base.transcriptPath ? lastClaudeAssistant(base.transcriptPath) : "");
      return { ...base, type: "stopped", attention: asksForInput(last) ? "question" : undefined, summary: last };
    }
    case "StopFailure":
      return { ...base, type: "failed", summary: s(payload.error) || s(payload.message) };
    case "SessionEnd":
      return { ...base, type: "ended" };
    default:
      return null;
  }
}

const claudeNavigation = { openUrl, activateBundle, copyToClipboard, jumpToCli, readClaudeDesktopSessions };

/** Desktop continue URLs require local_* IDs, never the CLI transcript UUID. */
export async function jumpClaude(session: Session, config: Config, navigation = claudeNavigation): Promise<JumpResult> {
  const records = navigation.readClaudeDesktopSessions();
  const resolved = enrichClaudeSessions([session], records)[0];
  if (resolved.host !== "app") return navigation.jumpToCli(resolved, `claude --resume ${shQuote(resolved.sessionId)}`, config);
  const record = findClaudeDesktopSession(resolved.sessionId, records);
  const desktopId = record?.sessionId || resolved.locator.claudeDesktopId || resolved.sessionId;
  let url: string | undefined;
  if (CLAUDE_LOCAL_ID.test(desktopId) && !record?.isArchived) {
    url = `claude://code/continue?session=${encodeURIComponent(desktopId)}`;
  } else if (/^(cse|session)_[A-Za-z0-9_-]+$/.test(resolved.sessionId)) {
    url = `claude://code/${encodeURIComponent(resolved.sessionId)}`;
  }
  if (url && (await navigation.openUrl(url))) return { ok: true, method: "url" };
  const activated = await navigation.activateBundle(CLAUDE_APP_BUNDLE);
  const copied = await navigation.copyToClipboard(resolved.sessionId);
  return { ok: activated && copied, method: "copied" };
}

export const claudeAdapter: Adapter = {
  id: "claude",
  source: {
    titles: readClaudeTitles,
    transcript: claudeTranscript,
    locateTranscript: async (session) => {
      const local = findClaudeDesktopSession(session.sessionId, readClaudeDesktopSessions());
      if (!local && CLAUDE_BRIDGE_ID.test(session.sessionId)) return undefined;
      return findTranscript(CLAUDE_PROJECTS, local?.cliSessionId || session.sessionId);
    },
  },
  name: "Claude Code",
  icon: "claude.svg",

  detect(): DetectResult {
    const cli = existsSync(CLAUDE_DIR);
    const app = CLAUDE_APP_PATHS.some(existsSync);
    let hooked = false;
    try {
      hooked = hasOurHooks(parseJsonFile(read(CLAUDE_SETTINGS), CLAUDE_SETTINGS), CLAUDE_EVENTS);
    } catch {
      hooked = false;
    }
    const hosts: Host[] = [];
    if (cli) hosts.push("cli");
    if (app) hosts.push("app");
    return { present: cli || app, hooked, hosts };
  },

  planInstall(ctx: HookContext): InstallPlan {
    const before = read(CLAUDE_SETTINGS);
    const entries = hookEntries(ctx);
    const after = stringify(withOurHooks(parseJsonFile(before, CLAUDE_SETTINGS), entries));
    return {
      changes: [
        {
          path: CLAUDE_SETTINGS,
          before,
          after,
          summary: CLAUDE_EVENTS.join(" · "),
          preview: JSON.stringify({ hooks: Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, [v]])) }, null, 2),
          previewLang: "json",
        },
      ],
      notes: [],
    };
  },

  planUninstall(): InstallPlan {
    const before = read(CLAUDE_SETTINGS);
    if (!before) return { changes: [], notes: [] };
    const after = stringify(withoutOurHooks(parseJsonFile(before, CLAUDE_SETTINGS)));
    return {
      changes: [{ path: CLAUDE_SETTINGS, before, after, summary: CLAUDE_EVENTS.join(" · "), preview: "", previewLang: "json" }],
      notes: [],
    };
  },

  parseHook(_kind, payload, env) {
    return parseClaudeHook(payload, env);
  },

  jump: jumpClaude,
};
