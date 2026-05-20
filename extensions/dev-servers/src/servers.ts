import { exec, spawn } from "child_process";
import * as fs from "node:fs";
import { promisify } from "util";
import { DevServer } from "./types";

const execAsync = promisify(exec);

// Grabs all listening ports once up front to avoid repeated lsof calls,
// then iterates over candidate dev-server PIDs (anything launched via
// node_modules/.bin/, plus bun processes) and emits one pipe-delimited
// line per server: PID|PORT|CWD|STARTED|TOOL
//
// Uses `while read -r PID` (not `for PID in $PIDS`) to correctly iterate in zsh,
// where unquoted variable expansion does not word-split on newlines.
//
// lstart format: "Wed Apr 16 10:23:45 2026". V8 parses this correctly via new Date().
//
// Bun support: the awk filter matches either node_modules/.bin/ in the full
// command line OR a bare `bun` (or path-suffixed `/bun`) in the executable
// column ($11). The `[ -z "$PORT" ] && continue` then drops any bun process
// not actually listening, so we never surface random `bun some-script.ts` runs.
export const FETCH_SCRIPT = `
PORTS=$(lsof -iTCP -sTCP:LISTEN -nP 2>/dev/null | awk 'NR>1 {n=split($9,a,":"); print $2, a[n]}')
ps aux | grep -v grep | awk '
  /node_modules\\/\\.bin\\// { print $2; next }
  $11 ~ /(\\/|^)bun$/ { print $2 }
' | sort -u | while read -r PID; do
  CMD=$(ps -p $PID -o command= 2>/dev/null) || continue
  # A single dev-server PID often has multiple LISTEN sockets: the main HTTP
  # server plus ephemeral OS-assigned ports for HMR/IPC/prebundling. We pick
  # the LOWEST port because configured dev ports (3000, 4321, 5173, 8080)
  # are always below ephemeral ports (32768-65535). lsof's order is otherwise
  # non-deterministic and would flicker the displayed port across refreshes.
  PORT=$(echo "$PORTS" | awk -v p=$PID '$1==p {print $2}' | sort -n | head -1)
  [ -z "$PORT" ] && continue
  CWD=$(lsof -p $PID -a -d cwd 2>/dev/null | awk 'NR>1 {print $NF}')
  STARTED=$(ps -p $PID -o lstart= 2>/dev/null)
  TOOL=$(echo "$CMD" | grep -oE 'node_modules/.bin/[^ ]+' | xargs basename 2>/dev/null)
  # Runtime detection: check the actual executable, not the full command line.
  # ps -o comm= returns the process basename (sometimes a full path on macOS).
  # This identifies "true bun" only. Bun delegating to node via vite's shebang
  # shows as node here, which is correct since the listening process IS node.
  COMM=$(ps -p $PID -o comm= 2>/dev/null)
  if [[ "$COMM" == "bun" || "$COMM" == */bun ]]; then
    RUNTIME="bun"
  else
    RUNTIME="node"
  fi
  # If no node_modules/.bin/ tool was found but the command is bun, label it bun
  if [[ -z "$TOOL" ]] && echo "$CMD" | grep -qE '(/|^)bun( |$)'; then
    TOOL="bun"
  fi
  # SvelteKit runs under vite, so detect it by the presence of svelte.config in the project root
  if [[ "$TOOL" == "vite" && (-f "$CWD/svelte.config.js" || -f "$CWD/svelte.config.ts") ]]; then
    TOOL="sveltekit"
  fi
  echo "$PID|$PORT|$CWD|$STARTED|$TOOL|$RUNTIME"
done
`;

export function parseServers(stdout: string): DevServer[] {
  return stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [pid, port, cwd, started, tool, runtime] = line.split("|");
      return {
        pid: parseInt(pid),
        port,
        url: `http://localhost:${port}`,
        tool: tool?.trim() || "node",
        runtime: runtime?.trim() === "bun" ? "bun" : "node",
        cwd,
        projectName: cwd?.split("/").pop() || cwd,
        startedAt: new Date(started?.trim() ?? ""),
      } as DevServer;
    })
    .filter((s) => s.port && !isNaN(s.pid));
}

export async function killProcess(pid: number): Promise<void> {
  await execAsync(`kill ${pid}`);
}

export type PackageManager = "bun" | "pnpm" | "yarn" | "npm";

// Detect package manager from lockfile presence. First match wins.
// Order is bun → pnpm → yarn → npm because bun/pnpm/yarn projects often
// also retain a stale package-lock.json.
export function detectPackageManager(cwd: string): PackageManager {
  if (fs.existsSync(`${cwd}/bun.lockb`) || fs.existsSync(`${cwd}/bun.lock`))
    return "bun";
  if (fs.existsSync(`${cwd}/pnpm-lock.yaml`)) return "pnpm";
  if (fs.existsSync(`${cwd}/yarn.lock`)) return "yarn";
  return "npm";
}

const PM_COMMAND: Record<PackageManager, [string, string[]]> = {
  bun: ["bun", ["run", "dev"]],
  pnpm: ["pnpm", ["dev"]],
  yarn: ["yarn", ["dev"]],
  npm: ["npm", ["run", "dev"]],
};

// Slugify cwd for use in a /tmp log filename.
function cwdSlug(cwd: string): string {
  return cwd.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "root";
}

// Restart a dev server using the project's detected package manager.
//
// Implementation notes:
// - We launch via `/bin/zsh -ilc` so the user's PATH is loaded. `-l` reads
//   `~/.zprofile`; `-i` reads `~/.zshrc`. Most users put their PATH additions
//   for nvm/bun/pnpm in `~/.zshrc`, so both flags are required. Raycast's
//   GUI-app PATH is otherwise too minimal to find these tools.
// - `cwd` is passed as a spawn option (NOT shell-concatenated) which removes
//   the prior shell-injection surface in the path.
// - `detached: true` + `unref()` lets the spawned process outlive the extension
//   command's lifetime.
// - The log filename is now keyed by a slug of cwd, so it stays meaningful
//   after the PID has been replaced by the new server.
export async function restartServer(server: DevServer): Promise<void> {
  await execAsync(`kill ${server.pid}`);
  const pm = detectPackageManager(server.cwd);
  const [cmd, args] = PM_COMMAND[pm];
  const logPath = `/tmp/dev-servers-restart-${cwdSlug(server.cwd)}.log`;
  const out = fs.openSync(logPath, "a");
  const child = spawn("/bin/zsh", ["-ilc", `exec ${cmd} ${args.join(" ")}`], {
    cwd: server.cwd,
    detached: true,
    stdio: ["ignore", out, out],
  });
  child.unref();
}
