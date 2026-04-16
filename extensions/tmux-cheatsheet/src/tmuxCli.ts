import { execFileSync } from "child_process";

// tmux is commonly installed via Homebrew or MacPorts. Raycast's Node env
// ships a minimal PATH that doesn't include these, so try known locations
// before falling back to PATH.
const TMUX_PATHS = ["/opt/homebrew/bin/tmux", "/usr/local/bin/tmux", "/opt/local/bin/tmux", "tmux"];

// Unique socket name for our probe server. Isolating via -L lets us read the
// user's config without depending on (or interfering with) their running
// tmux session, whose socket path may be relocated by TMUX_TMPDIR.
const SOCKET = "raycast-cheatsheet";

function runTmux(commands: string[][]): string | undefined {
  const args = ["-L", SOCKET, "start-server"];
  for (const cmd of commands) {
    args.push(";", ...cmd);
  }
  args.push(";", "kill-server");

  for (const path of TMUX_PATHS) {
    try {
      return execFileSync(path, args, { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
    } catch {
      // try next path
    }
  }
  return undefined;
}

export function showGlobalOption(name: string): string | undefined {
  const output = runTmux([["show-options", "-g", "-v", name]]);
  return output?.trim() || undefined;
}

export function listKeys(table: string): string | undefined {
  return runTmux([["list-keys", "-T", table]]);
}
