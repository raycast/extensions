/**
 * agent-inbox — the core CLI used by hooks.
 *
 *   agent-inbox hook claude                   (Claude Code hook, JSON on stdin)
 *   agent-inbox hook codex                    (Codex hooks.json hook, JSON on stdin)
 *   agent-inbox hook codex-notify [--then <cmd…>] <json>   (Codex `notify`, JSON as last argument)
 *   agent-inbox event --agent <id> --session <id> --type <type> [--summary s] [--title t] [--cwd dir] [--host cli|app]
 *   agent-inbox jump <agent> <session>
 *   agent-inbox list [--json]
 *
 * Hooks must never break the agent: every failure is logged to ~/.sessions/log.txt and the
 * process exits 0.
 */
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { getAdapter, allAdapters } from "../src/core/adapters";
import { readConfig } from "../src/core/config";
import { Store } from "../src/core/db";
import { detach } from "../src/core/exec";
import { captureLocator } from "../src/core/locate";
import { EventEngine } from "../src/core/engine";
import { deliverNotifications } from "../src/core/notifications";
import { TranscriptCollector } from "../src/core/sources/collector";
import { TitleSynchronizer } from "../src/core/titles";
import { installCollector } from "../src/core/service";
import { applyPlan, resolveNode } from "../src/core/install";
import { LOG_PATH, ROOT } from "../src/core/paths";
import { AgentEvent, Attention, EventType, Host } from "../src/core/types";

const EVENT_TYPES: EventType[] = [
  "started",
  "progress",
  "tool",
  "needs_input",
  "resolved",
  "stopped",
  "completed",
  "failed",
  "quota",
  "interrupted",
  "ended",
];

const HELP = `Agent Inbox — subscribe to agent sessions and return when they need you.

usage: agent-inbox <command> [options]

Commands:
  list [--json]                         Show up to 100 recorded sessions
  jump <agent> <session>                 Return to a recorded session
  event --agent <id> --session <id> --type <type> [options]
                                        Record an external event
  hook <claude|codex>                    Read a hook payload from stdin
  hook codex-notify [--then <cmd...>] <json>
                                        Record and forward Codex notify
  watch [--once]                        Collect subscribed sessions and deliver notifications
  deliver                               Deliver queued notifications
  install <agent...> [--collector]       Install hooks and optionally the macOS collector
  version                               Print the internal CLI protocol revision
  help, --help, -h                       Show this help without creating state

Event types: ${EVENT_TYPES.join(", ")}
Event options: --title, --summary, --cwd, --host cli|app, --attention,
               --event-id, --turn, --request <id[,id...]>, --at <epoch-ms>
Attention: input, question, permission, failed, quota, interrupted

Data directory: AGENT_INBOX_HOME (default: ~/.sessions)
Install modifies agent configuration; watch and deliver may send notifications.
Setup, isolated examples and option defaults: docs/cli.md in the repository.
`;

function log(msg: string) {
  try {
    mkdirSync(ROOT, { recursive: true });
    appendFileSync(LOG_PATH, `${new Date().toISOString()} ${msg}\n`);
  } catch {
    // nothing else we can do
  }
}

function readStdin(): string {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function parseJson(text: string): Record<string, unknown> {
  try {
    const v = JSON.parse(text);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

async function record(ev: AgentEvent) {
  const store = new Store();
  const t = await new EventEngine(store, readConfig).ingest(ev);
  if (t?.notify) detach(process.execPath, [process.argv[1], "deliver"]);
  return t;
}

async function hook(kind: string, args: string[]) {
  const adapterId = kind === "codex-notify" ? "codex" : kind;
  let payload: Record<string, unknown>;
  if (kind === "codex-notify") {
    const json = args[args.length - 1] ?? "{}";
    payload = parseJson(json);
    // Keep the user's own notify program working.
    const then = args.indexOf("--then");
    if (then !== -1 && args.length - 1 > then + 1) {
      const cmd = args.slice(then + 1, -1);
      detach(cmd[0], [...cmd.slice(1), json]);
    }
  } else {
    payload = parseJson(readStdin());
  }
  const adapter = getAdapter(adapterId);
  if (!adapter?.parseHook) return;
  const ev = adapter.parseHook(kind, payload, process.env);
  if (!ev) return;
  if (ev.type !== "tool") ev.locator = { ...(await captureLocator(process.env)), ...ev.locator };
  await record(ev);
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : undefined;
}

async function event(args: string[]) {
  const agent = flag(args, "agent");
  const sessionId = flag(args, "session");
  const type = flag(args, "type") as EventType | undefined;
  if (!agent || !sessionId || !type || !EVENT_TYPES.includes(type)) {
    process.stderr.write(
      `usage: agent-inbox event --agent <id> --session <id> --type <${EVENT_TYPES.join("|")}> [--summary s] [--title t] [--cwd dir] [--host cli|app]\n`,
    );
    process.exitCode = 2;
    return;
  }
  const host = flag(args, "host") as Host | undefined;
  const attention = flag(args, "attention") as Attention | undefined;
  if (attention && !["input", "question", "permission", "failed", "quota", "interrupted"].includes(attention)) {
    process.stderr.write("usage: --attention <input|question|permission|failed|quota|interrupted>\n");
    process.exitCode = 2;
    return;
  }
  await record({
    agent,
    sessionId,
    type,
    host: host === "app" ? "app" : host === "cli" ? "cli" : undefined,
    attention,
    cwd: flag(args, "cwd") ?? process.cwd(),
    title: flag(args, "title"),
    summary: flag(args, "summary"),
    locator: await captureLocator(process.env),
    at: Number(flag(args, "at")) || Date.now(),
    source: "external",
    eventId: flag(args, "event-id"),
    turnId: flag(args, "turn"),
    requestIds: flag(args, "request")?.split(","),
  });
}

async function jump(args: string[]) {
  const [agent, sessionId] = args;
  const store = new Store();
  const s = agent && sessionId ? await store.get(agent, sessionId) : undefined;
  const adapter = agent ? getAdapter(agent) : undefined;
  if (!s || !adapter) {
    process.stderr.write("session not found\n");
    process.exitCode = 1;
    return;
  }
  const r = await adapter.jump(s, readConfig());
  process.stdout.write(`${r.method}\n`);
  if (!r.ok) process.exitCode = 1;
}

async function list(args: string[]) {
  const rows = await new Store().all(100);
  if (args.includes("--json")) {
    process.stdout.write(JSON.stringify(rows, null, 2) + "\n");
    return;
  }
  for (const s of rows) {
    process.stdout.write(`${s.status.padEnd(11)} ${s.subscribed ? "●" : " "} ${s.agent}/${s.host} ${s.sessionId}  ${s.title}\n`);
  }
}

async function watch(once = false) {
  const store = new Store();
  const collector = new TranscriptCollector(new EventEngine(store, readConfig), allAdapters, log);
  const titles = new TitleSynchronizer(store, allAdapters);
  let stopping = false;
  const stop = () => {
    stopping = true;
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  try {
    do {
      try {
        await collector.poll();
        await titles.refresh(await store.subscribed());
        await deliverNotifications(store, readConfig());
      } catch (error) {
        log(`collector: ${String(error)}`);
      }
      if (once || stopping) break;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } while (!stopping);
  } finally {
    process.removeListener("SIGTERM", stop);
    process.removeListener("SIGINT", stop);
  }
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  switch (cmd) {
    case "help":
    case "--help":
    case "-h":
      process.stdout.write(HELP);
      return;
    case "watch":
      return watch(rest.includes("--once"));
    case "deliver":
      return deliverNotifications(new Store(), readConfig());
    case "install": {
      const node = await resolveNode();
      if (!node) throw new Error("No Node runtime available for hooks");
      for (const id of rest.filter((arg) => !arg.startsWith("--"))) {
        const adapter = getAdapter(id);
        if (!adapter) throw new Error(`Unknown agent: ${id}`);
        applyPlan(adapter.planInstall({ node, cli: process.argv[1] }));
      }
      if (rest.includes("--collector")) await installCollector(node, process.argv[1]);
      return;
    }
    case "hook":
      try {
        await hook(rest[0] ?? "", rest.slice(1));
      } catch (e) {
        log(`hook ${rest[0]}: ${(e as Error).stack ?? e}`);
      }
      return;
    case "event":
      return event(rest);
    case "jump":
      return jump(rest);
    case "list":
      return list(rest);
    case "engine-probe":
    case "version":
      process.stdout.write("agent-inbox 1\n");
      return;
    default:
      process.stderr.write("usage: agent-inbox <command> [options]\nRun agent-inbox --help for commands and options.\n");
      process.exitCode = 2;
  }
}

main().catch((e) => {
  log(`fatal: ${(e as Error).stack ?? e}`);
  process.stderr.write(`${(e as Error).message ?? e}\n`);
  process.exitCode = 1;
});
