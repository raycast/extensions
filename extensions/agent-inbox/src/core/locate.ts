import { run } from "./exec";
import { Locator } from "./types";

/** Controlling terminal of a process ("/dev/ttys003"), if it has one. */
export async function ttyOf(pid: number, execute = run): Promise<string | undefined> {
  const r = await execute("/bin/ps", ["-o", "tty=", "-p", String(pid)], undefined, 2000);
  const tty = r.stdout.trim();
  if (!r.ok || !tty || tty.startsWith("?")) return undefined;
  return tty.startsWith("/dev/") ? tty : `/dev/${tty}`;
}

/**
 * Where does the session live? Hooks inherit the agent's environment and controlling terminal,
 * so tmux pane, terminal app and tty can be read from the hook process itself.
 */
export async function captureLocator(env: NodeJS.ProcessEnv, pid = process.ppid, execute = run): Promise<Locator> {
  const loc: Locator = {};
  if (env.TMUX_PANE) loc.tmuxPane = env.TMUX_PANE;
  if (env.TMUX) loc.tmuxSocket = env.TMUX.split(",")[0];
  if (env.__CFBundleIdentifier) loc.bundleId = env.__CFBundleIdentifier;
  if (env.TERM_PROGRAM) loc.termProgram = env.TERM_PROGRAM;
  const tty = await ttyOf(pid, execute);
  if (tty) loc.tty = tty;
  const seen = new Set<number>();
  for (let depth = 0; pid > 1 && depth < 12 && !seen.has(pid); depth++) {
    seen.add(pid);
    const process = await readProcess(pid, execute);
    if (!process) break;
    if (isAgentProcess(process.command) && process.tty === loc.tty) {
      loc.pid = pid;
      loc.processStartedAt = process.startedAt;
      break;
    }
    pid = process.parent;
  }
  return loc;
}

function isAgentProcess(command: string): boolean {
  const [executable, script = ""] = command.trim().split(/\s+/);
  if (/(?:^|\/)(?:claude|codex)$/.test(executable)) return true;
  return /(?:^|\/)node$/.test(executable) && /\/@(?:anthropic-ai\/claude-code|openai\/codex)\//.test(script);
}

async function readProcess(pid: number, execute = run) {
  const result = await execute(
    "/bin/ps",
    ["-ww", "-p", String(pid), "-o", "ppid=,tty=,lstart=,args="],
    undefined,
    2000,
  );
  if (!result.ok) return undefined;
  const match = result.stdout.trim().match(/^(\d+)\s+(\S+)\s+(\w{3}\s+\w{3}\s+\d+\s+\d+:\d+:\d+\s+\d{4})\s+(.+)$/);
  if (!match) return undefined;
  return {
    parent: Number(match[1]),
    tty: match[2].startsWith("/") ? match[2] : `/dev/${match[2]}`,
    startedAt: match[3].replace(/\s+/g, " "),
    command: match[4],
  };
}

/** A tty being alive is insufficient: it must still contain the recorded agent process. */
export async function terminalOwnerAlive(locator: Locator, execute = run): Promise<boolean> {
  if (!locator.tty || !locator.pid || !locator.processStartedAt) return false;
  const process = await readProcess(locator.pid, execute);
  return (
    !!process &&
    process.tty === locator.tty &&
    process.startedAt === locator.processStartedAt &&
    isAgentProcess(process.command)
  );
}

export const TERMINAL_LOCATOR_KEYS = [
  "tty",
  "tmuxPane",
  "tmuxSocket",
  "pid",
  "processStartedAt",
  "observedAt",
] as const;

export function releaseTerminal(locator: Locator): Locator {
  const next = { ...locator };
  for (const key of TERMINAL_LOCATOR_KEYS) delete next[key];
  return next;
}
