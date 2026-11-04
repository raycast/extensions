import { run } from "./exec";
import { Locator } from "./types";

/** Controlling terminal of a process ("/dev/ttys003"), if it has one. */
export async function ttyOf(pid: number): Promise<string | undefined> {
  const r = await run("/bin/ps", ["-o", "tty=", "-p", String(pid)], undefined, 2000);
  const tty = r.stdout.trim();
  if (!r.ok || !tty || tty.startsWith("?")) return undefined;
  return tty.startsWith("/dev/") ? tty : `/dev/${tty}`;
}

/**
 * Where does the session live? Hooks inherit the agent's environment and controlling terminal,
 * so tmux pane, terminal app and tty can be read from the hook process itself.
 */
export async function captureLocator(env: NodeJS.ProcessEnv, pid = process.ppid): Promise<Locator> {
  const loc: Locator = {};
  if (env.TMUX_PANE) loc.tmuxPane = env.TMUX_PANE;
  if (env.TMUX) loc.tmuxSocket = env.TMUX.split(",")[0];
  if (env.__CFBundleIdentifier) loc.bundleId = env.__CFBundleIdentifier;
  if (env.TERM_PROGRAM) loc.termProgram = env.TERM_PROGRAM;
  const tty = await ttyOf(pid);
  if (tty) loc.tty = tty;
  return loc;
}
