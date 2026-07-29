import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { promisify } from "node:util";

const run = promisify(execFile);

/**
 * Raycast runs commands in a minimal Node environment — it does NOT inherit the
 * interactive shell's PATH, so `tidy-ports` is almost never resolvable by name here even
 * when it works fine in a terminal. Resolve it explicitly, bundled copy first, since that
 * is the one every user has by virtue of installing the app.
 */
const CANDIDATES = [
  "/Applications/Tidy Ports.app/Contents/Resources/cli/bin/tidy-ports",
  `${homedir()}/Applications/Tidy Ports.app/Contents/Resources/cli/bin/tidy-ports`,
  "/opt/homebrew/bin/tidy-ports",
  "/usr/local/bin/tidy-ports",
  `${homedir()}/.local/bin/tidy-ports`,
];

export class TidyPortsMissingError extends Error {
  constructor() {
    super("TidyPorts isn't installed");
  }
}

function binPath(): string {
  const found = CANDIDATES.find((p) => existsSync(p));
  if (!found) throw new TidyPortsMissingError();
  return found;
}

/** A listening dev server, as the CLI reports it. */
export interface Listener {
  port: number;
  pid: number | null;
  comm: string;
  cwd: string;
  branch: string;
  gitRoot: string;
  idle: boolean;
  tag: string;
  mem: number | null;
  cpu: number | null;
  etime: string;
  /** Provenance: the agent that launched it (Claude Code, Cursor agent…), when known. */
  agent: string | null;
  /** Provenance: the surface it was launched from (Ghostty, iTerm, tmux…). */
  surface: string | null;
  source: string | null;
  exposed: boolean;
  exposedAddr: string | null;
}

async function tidyPorts(args: string[], timeoutMs = 15000): Promise<string> {
  const { stdout } = await run(binPath(), args, {
    timeout: timeoutMs,
    maxBuffer: 8 * 1024 * 1024,
    // TP_PORCELAIN keeps the output machine-readable; TP_NO_COLOR strips ANSI, which
    // would otherwise end up rendered literally in Raycast's list.
    env: {
      ...process.env,
      // Raycast's PATH is not the shell's, and on macOS `lsof` lives in /usr/sbin — which
      // it frequently omits. Without this the CLI refuses to run at all ("needs 'lsof'"),
      // which looks like a broken extension rather than a missing directory.
      //
      // System paths come FIRST, then Homebrew for docker/git. That ordering is deliberate:
      // putting user-writable directories ahead of /usr/bin would let anything dropped in
      // them shadow a system binary this extension then executes.
      PATH: `/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:/usr/local/bin:${process.env.PATH ?? ""}`,
      TP_NO_COLOR: "1",
      TP_PORCELAIN: "1",
    },
  });
  return stdout;
}

/**
 * Mirrors `Listener.likelyDevelopment` in the app (Models.swift). The CLI reports every
 * listening socket, which on a real Mac means ControlCenter, Figma and a row per Docker
 * container — noise that buries the two or three things you actually care about and makes
 * this look like any other port list.
 *
 * Keep this in step with the app's list, or the two surfaces will disagree about what a
 * dev server is.
 */
const DEV_RUNTIMES = new Set([
  "node",
  "bun",
  "deno",
  "ruby",
  "php",
  "java",
  "go",
  "uvicorn",
  "gunicorn",
  "puma",
  "rails",
  "flask",
  "dotnet",
  "mix",
  "elixir",
  "beam.smp",
  "cargo",
  "vite",
  "astro",
  "storybook",
  "webpack",
  "tsx",
  "ts-node",
  "next",
  "nuxt",
  "remix",
  "ng",
]);

export function isLikelyDevServer(l: Listener): boolean {
  if (l.tag === "required" || l.tag === "context" || l.tag === "storybook")
    return true;
  const name = (l.comm.split("/").pop() ?? "").toLowerCase();
  return (
    DEV_RUNTIMES.has(name) ||
    name.startsWith("python") ||
    name.startsWith("php") ||
    // Frameworks that rename the process: Next becomes "next-server (v16…)".
    name.startsWith("next-server")
  );
}

export async function listServers(): Promise<Listener[]> {
  const raw = await tidyPorts(["json", "--basic"]);
  const parsed = JSON.parse(raw) as { listeners?: Listener[] };
  return (parsed.listeners ?? []).sort((a, b) => a.port - b.port);
}

export async function killPort(port: number): Promise<void> {
  await tidyPorts(["portless", "kill", String(port)]);
}

/** "Claude Code, in Ghostty" — the line that makes this more than a port list. */
export function provenance(l: Listener): string | null {
  if (l.agent && l.surface) return `${l.agent}, in ${l.surface}`;
  return l.agent ?? l.surface ?? l.source ?? null;
}
