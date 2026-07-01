import { execFileSync } from "child_process";

// tmux is commonly installed via Homebrew or MacPorts. Raycast's Node env
// ships a minimal PATH that doesn't include these, so try known locations
// before falling back to PATH.
const TMUX_PATHS = ["/opt/homebrew/bin/tmux", "/usr/local/bin/tmux", "/opt/local/bin/tmux", "tmux"];

// Unique socket name for our probe server. Isolating via -L lets us read the
// user's config without depending on (or interfering with) their running
// tmux session, whose socket path may be relocated by TMUX_TMPDIR.
const SOCKET = "raycast-cheatsheet";
const TIMEOUT_MS = 5000;

type ExecError = NodeJS.ErrnoException & { stdout?: Buffer | string };

function runTmux(commands: string[][]): string | undefined {
  const args = ["-L", SOCKET, "start-server"];
  for (const cmd of commands) {
    args.push(";", ...cmd);
  }
  args.push(";", "kill-server");

  for (const path of TMUX_PATHS) {
    try {
      return execFileSync(path, args, { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"], timeout: TIMEOUT_MS });
    } catch (err) {
      const e = err as ExecError;
      if (e.code === "ENOENT") {
        continue;
      }
      // Binary ran but exited non-zero (e.g. late `kill-server` failure).
      // Recover stdout we already captured rather than retrying the next path.
      return typeof e.stdout === "string" ? e.stdout : undefined;
    }
  }
  return undefined;
}

export interface TmuxState {
  readonly prefix: string | undefined;
  readonly bindingsOutput: string | undefined;
}

/**
 * Reads the global prefix option and the prefix-table keybindings in a single
 * tmux invocation (one server start/kill).
 *
 * The batched output places the prefix value on the first line, followed by
 * the `bind-key ...` lines from `list-keys -T prefix`.
 */
export function readTmuxState(): TmuxState {
  const output = runTmux([
    ["show-options", "-g", "-v", "prefix"],
    ["list-keys", "-T", "prefix"],
  ]);
  if (!output) return { prefix: undefined, bindingsOutput: undefined };

  const newlineIdx = output.indexOf("\n");
  if (newlineIdx === -1) {
    return { prefix: output.trim() || undefined, bindingsOutput: undefined };
  }

  const prefix = output.slice(0, newlineIdx).trim() || undefined;
  const bindingsOutput = output.slice(newlineIdx + 1) || undefined;
  return { prefix, bindingsOutput };
}
