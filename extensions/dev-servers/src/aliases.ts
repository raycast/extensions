import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Returns a map from listening port → list of custom URLs registered to that
// port (e.g. https://myapp.localhost → 3000). Used by the UI to swap the
// primary row label from `localhost:PORT` to the named domain when one
// exists.
//
// Resolution path: shell out to `portless list` via a login shell. portless's
// text output is its public, human-readable interface — far more stable than
// its internal ~/.portless/ state files. The login shell is required because
// Raycast's subprocess PATH doesn't include user-installed CLIs (same reason
// the restart flow in [servers.ts] uses `/bin/zsh -ilc`).
//
// Hard 3s timeout: this call sits in fetchServers' Promise.all, so a hung
// portless daemon would otherwise block the entire refresh cycle. On timeout
// the call rejects and we fall through to the same empty-map fallback as
// any other failure.
//
// Any failure (portless not installed, command-not-found, timeout, unexpected
// output) returns an empty map. Portless is treated as an optional
// enhancement, not a runtime dependency — when it's absent the UI silently
// falls back to plain `localhost:PORT` rows, per Raycast's "gracefully
// degrade" guidance.
//
// Cross-platform note: the zsh login-shell pattern is macOS/Linux. Windows
// will need its own variant (powershell -c "portless list"), wired up
// alongside the other platform primitives in [servers.ts].
export async function fetchAliases(): Promise<Map<number, string[]>> {
  const out = new Map<number, string[]>();
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync("/bin/zsh", ["-ilc", "portless list"], {
      timeout: 3000,
    }));
  } catch {
    return out;
  }
  // portless list output is one route per line:
  //   "  https://myapp.localhost  ->  localhost:3000  (pid 12345)"
  //   "  https://api.myapp.localhost  ->  localhost:3001  (alias)"
  for (const line of stdout.split("\n")) {
    const match = line.match(/^\s*(https?:\/\/\S+)\s+->\s+localhost:(\d+)\b/);
    if (!match) continue;
    const port = parseInt(match[2], 10);
    if (!(port > 0)) continue;
    const arr = out.get(port) ?? [];
    arr.push(match[1]);
    out.set(port, arr);
  }
  return out;
}
