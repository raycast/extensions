import { findTranscript } from "../sources/locate";
import { readCodexTitles } from "../codex-desktop";
import { codexTranscript, questionIds } from "../sources/transcripts";
import { existsSync, readFileSync } from "node:fs";
import { CODEX_CONFIG, CODEX_DIR, CODEX_HOOKS, CODEX_SESSIONS } from "../paths";
import { shQuote } from "../exec";
import { copyToClipboard, jumpToCli, openUrl } from "../jump";
import { asksForInput } from "../status";
import { AgentEvent, Config, Host, Session } from "../types";
import { Adapter, DetectResult, FileChange, HOOK_MARKER, HookContext, InstallPlan, JumpResult } from "./types";
import { hookIdentity, requestIds, questionTool, isAsyncAcknowledgement, eventTime } from "./events";
import { hasOurHooks, HookEntry, parseJsonFile, stringify, withOurHooks, withoutOurHooks } from "./json";

export const CODEX_APP_BUNDLE = "com.openai.codex";
const CODEX_APP_PATHS = ["/Applications/Codex.app", "/Applications/ChatGPT.app"];
/** Structured hook signals; notify remains a compatibility fallback. */
export const CODEX_HOOK_EVENTS = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PermissionRequest",
  "PostToolUse",
  "Stop",
  "SessionEnd",
] as const;

const THREAD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Use the app's external conversation-link contract, independent of its internal renderer routes. */
export async function jumpCodex(
  session: Session,
  config: Config,
  navigation = { openUrl, copyToClipboard, jumpToCli },
): Promise<JumpResult> {
  if (session.host !== "app") return navigation.jumpToCli(session, `codex resume ${shQuote(session.sessionId)}`, config);
  if (THREAD_ID.test(session.sessionId)) {
    const host = session.locator?.hostId ? `?hostId=${encodeURIComponent(session.locator.hostId)}` : "";
    if (await navigation.openUrl(`codex://threads/${session.sessionId}${host}`)) return { ok: true, method: "url" };
  }
  const launched = await navigation.openUrl("codex://launch");
  const copied = await navigation.copyToClipboard(session.sessionId);
  return { ok: launched && copied, method: "copied" };
}

function read(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

const s = (v: unknown): string => (typeof v === "string" ? v : "");

// ---------- config.toml `notify` editing (top-level key, array of strings) ----------

interface NotifySpan {
  start: number;
  end: number;
  items: string[];
}

/** Find the top-level `notify = [...]` assignment (before the first [table]). */
export function findNotify(toml: string): NotifySpan | null {
  const firstTable = toml.search(/^\s*\[/m);
  const region = firstTable === -1 ? toml : toml.slice(0, firstTable);
  const m = /^[ \t]*notify[ \t]*=[ \t]*\[/m.exec(region);
  if (!m) return null;
  let i = m.index + m[0].length;
  let inStr: string | null = null;
  let stringStart = i;
  const items: string[] = [];
  for (; i < toml.length; i++) {
    const c = toml[i];
    if (inStr) {
      if (c === "\\" && inStr === '"') i++;
      else if (c === inStr) {
        const value = toml.slice(stringStart, i + 1);
        if (inStr === '"') {
          try {
            items.push(JSON.parse(value));
          } catch {
            items.push(value.slice(1, -1));
          }
        } else items.push(value.slice(1, -1));
        inStr = null;
      }
    } else if (c === '"' || c === "'") {
      inStr = c;
      stringStart = i;
    } else if (c === "#") {
      while (i < toml.length && toml[i] !== "\n") i++;
    } else if (c === "]") break;
  }
  let end = i + 1;
  while (end < toml.length && toml[end] !== "\n") end++;
  return { start: m.index, end, items };
}

export function setNotify(toml: string, items: string[] | null): string {
  const span = findNotify(toml);
  const line = items ? `notify = [${items.map((x) => JSON.stringify(x)).join(", ")}]` : "";
  if (span) {
    const rest = toml.slice(span.end);
    if (!items) return toml.slice(0, span.start) + rest.replace(/^\n/, "");
    return toml.slice(0, span.start) + line + rest;
  }
  if (!items) return toml;
  return line + "\n" + (toml.startsWith("\n") || !toml ? "" : "\n") + toml;
}

/** Our notify wraps any existing notify program: [node, cli, hook, codex-notify, --then, ...original]. */
export function originalNotify(items: string[]): string[] {
  if (!items.some((x) => x.includes(HOOK_MARKER))) return items;
  const i = items.indexOf("--then");
  return i === -1 ? [] : items.slice(i + 1);
}

export function ourNotify(ctx: HookContext, existing: string[]): string[] {
  const orig = originalNotify(existing);
  const ours = [ctx.node, ctx.cli, "hook", "codex-notify"];
  return orig.length ? [...ours, "--then", ...orig] : ours;
}

// ---------- hook payload parsing ----------

function hostFromEnv(env: NodeJS.ProcessEnv): Host | undefined {
  if (env.__CFBundleIdentifier === CODEX_APP_BUNDLE || /codex_app|desktop/i.test(env.CODEX_INTERNAL_ORIGINATOR_OVERRIDE ?? ""))
    return "app";
  if (env.TERM_PROGRAM || env.TMUX || env.TTY) return "cli";
  return undefined;
}

/** `notify` payload: {"type":"agent-turn-complete","thread-id","cwd","input-messages","last-assistant-message"} */
export function parseCodexNotify(payload: Record<string, unknown>, env: NodeJS.ProcessEnv, now = Date.now()): AgentEvent | null {
  const type = s(payload.type);
  const sessionId = s(payload["thread-id"]) || s(payload.thread_id) || s(payload["session-id"]);
  if (!sessionId) return null;
  const inputs = Array.isArray(payload["input-messages"]) ? (payload["input-messages"] as unknown[]).map(s) : [];
  const last = s(payload["last-assistant-message"]);
  const base = {
    agent: "codex",
    sessionId,
    host: hostFromEnv(env),
    cwd: s(payload.cwd),
    title: inputs[0] ?? "",
    at: eventTime(payload.timestamp, now),
    source: "notify",
    turnId: s(payload["turn-id"]) || s(payload.turn_id) || undefined,
  };
  if (type === "agent-turn-complete") {
    return { ...base, type: "stopped", attention: asksForInput(last) ? "question" : undefined, summary: last };
  }
  if (/approval|permission/i.test(type)) return { ...base, type: "needs_input", attention: "permission", summary: last };
  return null;
}

/** hooks.json payload (Claude-compatible shape). */
export function parseCodexHook(payload: Record<string, unknown>, env: NodeJS.ProcessEnv, now = Date.now()): AgentEvent | null {
  const sessionId = s(payload.session_id) || s(payload.thread_id) || s(payload.conversation_id);
  const name = s(payload.hook_event_name);
  if (!sessionId) return null;
  const base = {
    agent: "codex",
    sessionId,
    host: hostFromEnv(env),
    cwd: s(payload.cwd),
    transcriptPath: s(payload.transcript_path),
    at: now,
    ...hookIdentity(payload, now),
  };
  if (name === "SessionStart") return { ...base, type: "started" };
  if (name === "UserPromptSubmit") return { ...base, type: "progress", title: s(payload.prompt) };
  if (name === "PreToolUse")
    return questionTool(s(payload.tool_name))
      ? {
          ...base,
          type: "needs_input",
          attention: "question",
          requestIds: questionIds(requestIds(payload)[0] ?? "", s(payload.tool_name), payload.tool_input),
        }
      : { ...base, type: "tool" };
  if (name === "PermissionRequest")
    return {
      ...base,
      type: "needs_input",
      attention: questionTool(s(payload.tool_name)) ? "question" : "permission",
      requestIds: questionIds(requestIds(payload)[0] ?? "", s(payload.tool_name), payload.tool_input),
    };
  if (name === "PostToolUse" || name === "PostToolUseFailure")
    return {
      ...base,
      type: "tool",
      requestIds: isAsyncAcknowledgement(payload.tool_response)
        ? []
        : questionIds(requestIds(payload)[0] ?? "", s(payload.tool_name), payload.tool_input),
    };
  if (name === "Stop")
    return {
      ...base,
      type: "stopped",
      summary: s(payload.last_assistant_message),
      attention: asksForInput(s(payload.last_assistant_message)) ? "question" : undefined,
    };
  if (name === "SessionEnd") return { ...base, type: "ended" };
  return null;
}

function hookEntries(ctx: HookContext): Record<string, HookEntry> {
  const command = `${shQuote(ctx.node)} ${shQuote(ctx.cli)} hook codex`;
  const out: Record<string, HookEntry> = {};
  for (const ev of CODEX_HOOK_EVENTS) out[ev] = { hooks: [{ type: "command", command, timeout: 5 }] };
  return out;
}

export const codexAdapter: Adapter = {
  id: "codex",
  source: {
    transcript: codexTranscript,
    locateTranscript: async (session) => findTranscript(CODEX_SESSIONS, session.sessionId, true),
    titles: readCodexTitles,
  },
  name: "Codex",
  icon: "openai.svg",

  detect(): DetectResult {
    const cli = existsSync(CODEX_DIR);
    const app = CODEX_APP_PATHS.some(existsSync);
    const toml = read(CODEX_CONFIG);
    let hooked = false;
    try {
      hooked =
        (findNotify(toml)?.items ?? []).some((x) => x.includes(HOOK_MARKER)) &&
        hasOurHooks(parseJsonFile(read(CODEX_HOOKS), CODEX_HOOKS), CODEX_HOOK_EVENTS);
    } catch {
      /* Invalid config is shown as not connected. */
    }
    const hosts: Host[] = [];
    if (cli) hosts.push("cli");
    if (app) hosts.push("app");
    return { present: cli || app, hooked, hosts };
  },

  planInstall(ctx: HookContext): InstallPlan {
    const changes: FileChange[] = [];
    const toml = read(CODEX_CONFIG);
    const existing = findNotify(toml)?.items ?? [];
    const notify = ourNotify(ctx, existing);
    changes.push({
      path: CODEX_CONFIG,
      before: toml,
      after: setNotify(toml, notify),
      summary: "notify",
      preview: `notify = [${notify.map((x) => JSON.stringify(x)).join(", ")}]`,
      previewLang: "toml",
    });
    const hooksText = read(CODEX_HOOKS);
    const entries = hookEntries(ctx);
    changes.push({
      path: CODEX_HOOKS,
      before: hooksText,
      after: stringify(withOurHooks(parseJsonFile(hooksText, CODEX_HOOKS), entries)),
      summary: CODEX_HOOK_EVENTS.join(" · "),
      preview: JSON.stringify({ hooks: Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, [v]])) }, null, 2),
      previewLang: "json",
    });
    return { changes, notes: ["setup.codexHooksNote"] };
  },

  planUninstall(): InstallPlan {
    const changes: FileChange[] = [];
    const toml = read(CODEX_CONFIG);
    const span = findNotify(toml);
    if (span && span.items.some((x) => x.includes(HOOK_MARKER))) {
      const orig = originalNotify(span.items);
      changes.push({
        path: CODEX_CONFIG,
        before: toml,
        after: setNotify(toml, orig.length ? orig : null),
        summary: "notify",
        preview: "",
        previewLang: "toml",
      });
    }
    const hooksText = read(CODEX_HOOKS);
    if (hooksText) {
      const file = parseJsonFile(hooksText, CODEX_HOOKS);
      if (hasOurHooks(file))
        changes.push({
          path: CODEX_HOOKS,
          before: hooksText,
          after: stringify(withoutOurHooks(file)),
          summary: "hooks",
          preview: "",
          previewLang: "json",
        });
    }
    return { changes, notes: [] };
  },

  parseHook(kind, payload, env) {
    return kind === "codex-notify" ? parseCodexNotify(payload, env) : parseCodexHook(payload, env);
  },

  jump: jumpCodex,
};
