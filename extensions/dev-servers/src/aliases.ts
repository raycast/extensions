import { Cache } from "@raycast/api";
import { execFile } from "node:child_process";
import * as fs from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Resolution of the portless binary and the login-shell PATH it needs.
//
// Earlier versions ran `/bin/zsh -ilc "portless list"` on every poll, which
// re-sourced ~/.zshrc (nvm init and friends) every few seconds, typically
// the single most expensive step of a refresh cycle. We now pay the login
// shell exactly once: resolve the absolute portless path plus the login
// PATH (still needed at exec time so the script's `#!/usr/bin/env node`
// shebang can find node), persist both in Raycast's Cache, and exec the
// binary directly on every subsequent poll.
interface PortlessResolution {
  bin: string; // absolute path to the portless executable
  PATH: string; // login-shell PATH, for the shebang's `env node`
}

const cache = new Cache();
const RESOLUTION_KEY = "portless-resolution-v1";

// Module state lives for the duration of one command session.
let resolution: PortlessResolution | undefined;
let resolvedThisSession = false;
// Negative cache: when a probe finds no portless install, don't re-pay the
// login shell on every poll; wait out the backoff first. portless is an
// optional enhancement, so staying silent for a few minutes after a fresh
// install is an acceptable trade for not spawning login shells in a loop.
let nextProbeAt = 0;
const PROBE_BACKOFF_MS = 5 * 60_000;

// One login shell, two answers: where portless lives and what PATH looks
// like. Output is wrapped in sentinel markers because ~/.zshrc is allowed to
// print arbitrary noise (greeting banners, nvm warnings) around our printf.
async function resolveViaLoginShell(): Promise<PortlessResolution | null> {
  try {
    const { stdout } = await execFileAsync(
      "/bin/zsh",
      ["-ilc", 'printf "<<%s||%s>>" "$(command -v portless)" "$PATH"'],
      { timeout: 5000 },
    );
    const match = stdout.match(/<<([\s\S]*?)\|\|([\s\S]*?)>>/);
    if (!match) return null;
    return { bin: match[1].trim(), PATH: match[2] };
  } catch {
    return null;
  }
}

async function getResolution(
  forceRefresh: boolean,
): Promise<PortlessResolution | null> {
  if (!forceRefresh) {
    if (resolution) return resolution;
    const persisted = cache.get(RESOLUTION_KEY);
    if (persisted) {
      try {
        const parsed = JSON.parse(persisted) as PortlessResolution;
        // Cheap staleness guard: the binary may have moved since the last
        // session (reinstall, version-manager switch). A failed exec also
        // forces a re-probe (see runPortlessList), so this only needs to
        // catch the common case early.
        if (parsed.bin && fs.existsSync(parsed.bin)) {
          resolution = parsed;
          return parsed;
        }
      } catch {
        // Corrupt cache entry; fall through to a fresh probe.
      }
    }
  }
  if (Date.now() < nextProbeAt) return null;
  const fresh = await resolveViaLoginShell();
  resolvedThisSession = true;
  if (!fresh || !fresh.bin) {
    nextProbeAt = Date.now() + PROBE_BACKOFF_MS;
    resolution = undefined;
    return null;
  }
  resolution = fresh;
  cache.set(RESOLUTION_KEY, JSON.stringify(fresh));
  return fresh;
}

// Run `portless list` via the resolved binary. A stale persisted resolution
// (binary moved, node dir gone) gets one in-session re-probe; a resolution we
// built this session that still fails is a real portless failure, so we
// return null and let the next poll try again.
async function runPortlessList(): Promise<string | null> {
  let res = await getResolution(false);
  for (let attempt = 0; res && attempt < 2; attempt++) {
    try {
      const { stdout } = await execFileAsync(res.bin, ["list"], {
        timeout: 3000,
        env: { ...process.env, PATH: res.PATH },
      });
      return stdout;
    } catch {
      if (resolvedThisSession) return null;
      res = await getResolution(true);
    }
  }
  return null;
}

// Returns a map from listening port → list of custom URLs registered to that
// port (e.g. https://myapp.localhost → 3000). Used by the UI to swap the
// primary row label from `localhost:PORT` to the named domain when one
// exists.
//
// portless's text output is its public, human-readable interface, far more
// stable than its internal ~/.portless/ state files.
//
// Hard 3s timeout on the exec: this call sits in fetchServers' Promise.all,
// so a hung portless daemon would otherwise block the entire refresh cycle.
//
// Any failure (portless not installed, command-not-found, timeout, unexpected
// output) returns an empty map. Portless is treated as an optional
// enhancement, not a runtime dependency. When it's absent the UI silently
// falls back to plain `localhost:PORT` rows, per Raycast's "gracefully
// degrade" guidance.
//
// Cross-platform note: the login-shell resolution is macOS/Linux. Windows
// will need its own variant (powershell -c "portless list"), wired up
// alongside the other platform primitives in [servers.ts].
export async function fetchAliases(): Promise<Map<number, string[]>> {
  const out = new Map<number, string[]>();
  const stdout = await runPortlessList();
  if (!stdout) return out;
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
