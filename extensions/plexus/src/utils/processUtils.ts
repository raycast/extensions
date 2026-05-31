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

// Find every listening TCP server. The HTTP probe in the service decides which of these are
// actually web pages worth showing; here we just enumerate and attach process info for naming.
export async function findListeningServers(): Promise<ListeningServer[]> {
  let servers: ListeningServer[];

  if (isWindows) {
    // Native Windows listeners + listeners inside WSL (forwarded to localhost but owned by
    // wslrelay on the Windows side, so they need a separate lookup through wsl.exe).
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

// --- macOS / Unix: lsof for discovery, ps for command, lsof for cwd ---
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

  const servers: ListeningServer[] = [];
  for (const pair of [...new Set(pairs)]) {
    const [pid, port] = pair.split(":");
    if (!pid || !port) continue;
    let command = "";
    try {
      command = (await execAsync(`ps -p ${pid} -o command=`)).stdout.trim();
    } catch {
      command = "";
    }
    let workingDir: string | null = null;
    try {
      const { stdout: cwd } = await execAsync(`lsof -p ${pid} | awk '$4=="cwd" {print $9}' | head -1`);
      workingDir = cwd.trim().startsWith("/") ? cwd.trim() : null;
    } catch {
      workingDir = null;
    }
    servers.push({ pid, port, source: "host", command, workingDir });
  }
  return servers;
}

// --- Windows host: one CIM query for all command lines, then map listeners to them ---
async function findWindowsHostServers(): Promise<ListeningServer[]> {
  const script =
    "$cmds=@{}; Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | ForEach-Object { $cmds[[string]$_.ProcessId]=$_.CommandLine }; " +
    "Get-NetTCPConnection -State Listen | ForEach-Object { " +
    "$proc=Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue; " +
    "if ($proc -and $proc.ProcessName -ne 'wslrelay') { " +
    '"$($_.OwningProcess)|$($_.LocalPort)|$($cmds[[string]$_.OwningProcess])" } }';
  const stdout = await runPowerShell(script);

  const servers: ListeningServer[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [pid, port, ...rest] = line.split("|");
    if (!pid || !port) continue;
    servers.push({
      pid: pid.trim(),
      port: port.trim(),
      source: "host",
      command: rest.join("|").trim(),
      workingDir: null,
    });
  }
  return servers;
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
