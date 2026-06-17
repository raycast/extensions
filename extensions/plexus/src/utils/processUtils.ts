import { exec, execFile } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

const isWindows = process.platform === "win32";

export type ListeningServer = {
  pid: string;
  port: string;
  source: "host" | "wsl";
  distro?: string;
  command: string;
  workingDir: string | null;
};

// Run a PowerShell command on Windows. Using execFile avoids cmd.exe quoting issues.
async function runPowerShell(script: string): Promise<string> {
  const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script]);
  return stdout;
}

// Find every listening TCP server, cheaply. Discovery only collects pid/port; command lines
// and working dirs for native-host servers are filled in afterwards (enrichHostServers) for
// just the few ports that pass the HTTP probe, so we never run per-process lookups for the
// dozens of system ports that aren't web servers. WSL listeners already come fully populated.
export async function findListeningServers(): Promise<ListeningServer[]> {
  let servers: ListeningServer[];

  if (isWindows) {
    const [host, wsl] = await Promise.all([
      findWindowsHostServers().catch(() => [] as ListeningServer[]),
      findWslServers().catch(() => [] as ListeningServer[]),
    ]);
    servers = [...host, ...wsl];
  } else {
    servers = await findUnixServers().catch(() => [] as ListeningServer[]);
  }

  // A server listening on both IPv4 and IPv6 yields duplicate entries; dedupe them.
  const seen = new Set<string>();
  return servers.filter((s) => {
    const key = `${s.source}:${s.pid}:${s.port}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Fill in command line (+ working dir on macOS) for native-host servers. Called only for the
// handful of ports that answered the HTTP probe, and runs the lookups in parallel.
export async function enrichHostServers(servers: ListeningServer[]): Promise<void> {
  const hosts = servers.filter((s) => s.source === "host" && !s.command);
  if (hosts.length === 0) return;

  if (isWindows) {
    const commands = await getWindowsCommandLines(hosts.map((s) => s.pid));
    for (const server of hosts) {
      server.command = commands.get(server.pid) ?? "";
    }
    return;
  }

  await Promise.all(
    hosts.map(async (server) => {
      // Guard before interpolating the pid into a shell command (mirrors the Windows path).
      if (!/^\d+$/.test(server.pid)) return;
      try {
        server.command = (await execAsync(`ps -p ${server.pid} -o command=`)).stdout.trim();
      } catch {
        server.command = "";
      }
      try {
        const { stdout } = await execAsync(`lsof -p ${server.pid} | awk '$4=="cwd" {print $9}' | head -1`);
        server.workingDir = stdout.trim().startsWith("/") ? stdout.trim() : null;
      } catch {
        server.workingDir = null;
      }
    }),
  );
}

// --- macOS / Unix: one lsof call lists every listener; enrichment is deferred to survivors ---
async function findUnixServers(): Promise<ListeningServer[]> {
  const { stdout } = await execAsync("/usr/sbin/lsof -nP -iTCP -sTCP:LISTEN");
  const pairs = stdout
    .trim()
    .split("\n")
    .slice(1) // skip lsof header
    .map((line) => {
      const parts = line.split(/\s+/);
      const pid = parts[1];
      const networkField = parts.find((part) => part.includes(":") && part.includes("->") === false);
      const portMatch = networkField?.match(/:(\d+)$/);
      return pid && portMatch && portMatch[1] ? `${pid}:${portMatch[1]}` : null;
    })
    .filter((pair): pair is string => Boolean(pair));

  return [...new Set(pairs)].map((pair) => {
    const [pid, port] = pair.split(":");
    return { pid, port, source: "host" as const, command: "", workingDir: null };
  });
}

// --- Windows host: netstat is ~25x faster than spinning up PowerShell. Command lines are
// fetched lazily (enrichHostServers) only for the few ports that pass the HTTP probe. ---
async function findWindowsHostServers(): Promise<ListeningServer[]> {
  const { stdout } = await execFileAsync("netstat", ["-ano", "-p", "TCP"]);
  const servers: ListeningServer[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (!/\bLISTENING\b/.test(line)) continue;
    const parts = line.trim().split(/\s+/);
    // Proto  Local Address  Foreign Address  State  PID
    const local = parts[1] ?? "";
    const pid = parts[parts.length - 1];
    const port = local.slice(local.lastIndexOf(":") + 1);
    if (!pid || !/^\d+$/.test(port)) continue;
    servers.push({ pid, port, source: "host", command: "", workingDir: null });
  }
  return servers;
}

// Fetch command lines for specific Windows PIDs in one CIM query (only used for survivors).
async function getWindowsCommandLines(pids: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const unique = [...new Set(pids)].filter((p) => /^\d+$/.test(p));
  if (unique.length === 0) return result;

  const filter = unique.map((p) => `ProcessId=${p}`).join(" or ");
  try {
    const stdout = await runPowerShell(
      `Get-CimInstance Win32_Process -Filter "${filter}" -ErrorAction SilentlyContinue | ForEach-Object { "$($_.ProcessId)|$($_.CommandLine)" }`,
    );
    for (const line of stdout.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const [pid, ...rest] = line.split("|");
      if (pid) result.set(pid.trim(), rest.join("|").trim());
    }
  } catch {
    // leave commands empty; names fall back to the page title
  }
  return result;
}

// --- WSL: enumerate listeners inside each running distro via wsl.exe ---
// Listen ports are reachable from Windows on http://localhost:<port> (WSL localhost
// forwarding); paths are translated to \\wsl.localhost\<distro>\... so Windows can read them.
const WSL_ENUMERATOR =
  "export PATH=/usr/sbin:/usr/bin:/sbin:/bin:$PATH; " +
  "ss -H -ltnp 2>/dev/null | while read -r line; do " +
  "laddr=$(echo \"$line\" | awk '{print $4}'); " +
  "port=${laddr##*:}; " +
  "pid=$(echo \"$line\" | grep -oE 'pid=[0-9]+' | head -1 | cut -d= -f2); " +
  '[ -z "$pid" ] && continue; ' +
  "cmd=$(tr '\\0' ' ' < /proc/$pid/cmdline 2>/dev/null); " +
  '[ -z "$cmd" ] && continue; ' +
  "cwd=$(readlink /proc/$pid/cwd 2>/dev/null); " +
  'echo "$port|$pid|$cwd|$cmd"; ' +
  "done";

function wslToUnc(distro: string, linuxPath: string): string {
  return `\\\\wsl.localhost\\${distro}${linuxPath.replace(/\//g, "\\")}`;
}

async function findWslServers(): Promise<ListeningServer[]> {
  // `wsl --list` output encoding varies (UTF-16LE on older builds); read raw bytes and
  // drop NUL bytes so ASCII distro names survive regardless of encoding.
  let distros: string[];
  try {
    const { stdout } = await execFileAsync("wsl.exe", ["--list", "--running", "--quiet"], { encoding: "buffer" });
    distros = stdout
      .toString("latin1")
      .replace(/^\xff\xfe/, "") // strip UTF-16LE BOM (FF FE) if present
      .split("\u0000")
      .join("")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }

  const all: ListeningServer[] = [];
  for (const distro of distros) {
    try {
      const { stdout } = await execFileAsync("wsl.exe", ["-d", distro, "-e", "bash", "-c", WSL_ENUMERATOR]);
      for (const line of stdout.split(/\r?\n/)) {
        if (!line.trim()) continue;
        const [port, pid, cwd, ...rest] = line.split("|");
        if (!port || !pid) continue;
        all.push({
          pid,
          port,
          source: "wsl",
          distro,
          command: rest.join("|").trim(),
          workingDir: cwd ? wslToUnc(distro, cwd) : null,
        });
      }
    } catch {
      // skip a distro we can't query
    }
  }
  return all;
}
