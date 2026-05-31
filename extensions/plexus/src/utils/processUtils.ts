import { exec, execFile } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

const isWindows = process.platform === "win32";

export type NodeProcess = {
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

export async function findNodeProcesses(): Promise<NodeProcess[]> {
  let procs: NodeProcess[];

  if (isWindows) {
    // On Windows, find native node servers AND node servers running inside WSL.
    // The latter are reachable on localhost but owned by wslrelay on the Windows side,
    // so they need a separate lookup through wsl.exe.
    const [host, wsl] = await Promise.all([
      findWindowsHostNodeProcesses().catch(() => [] as NodeProcess[]),
      findWslNodeProcesses().catch(() => [] as NodeProcess[]),
    ]);
    procs = [...host, ...wsl];
  } else {
    procs = await findUnixNodeProcesses().catch(() => [] as NodeProcess[]);
  }

  // A server listening on both IPv4 and IPv6 yields duplicate entries; dedupe them.
  const seen = new Set<string>();
  return procs.filter((p) => {
    const key = `${p.source}:${p.pid}:${p.port}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// --- macOS / Unix: lsof for discovery, ps for command, lsof for cwd ---
async function findUnixNodeProcesses(): Promise<NodeProcess[]> {
  const { stdout } = await execAsync("/usr/sbin/lsof -nP -iTCP -sTCP:LISTEN | grep node");
  const pairs = stdout
    .trim()
    .split("\n")
    .map((line) => {
      const parts = line.split(/\s+/);
      const pid = parts[1];
      const networkField = parts.find((part) => part.includes(":") && part.includes("->") === false);
      const portMatch = networkField?.match(/:(\d+)$/);
      return pid && portMatch && portMatch[1] ? `${pid}:${portMatch[1]}` : null;
    })
    .filter((pair): pair is string => Boolean(pair));

  const procs: NodeProcess[] = [];
  for (const pair of pairs) {
    const [pid, port] = pair.split(":");
    if (!pid || !port) continue;
    const command = (await execAsync(`ps -p ${pid} -o command=`)).stdout.trim();
    if (!command.includes("node")) continue;
    let workingDir: string | null = null;
    try {
      const { stdout: cwd } = await execAsync(`lsof -p ${pid} | awk '$4=="cwd" {print $9}' | head -1`);
      workingDir = cwd.trim().startsWith("/") ? cwd.trim() : null;
    } catch {
      workingDir = null;
    }
    procs.push({ pid, port, source: "host", command, workingDir });
  }
  return procs;
}

// --- Windows host: PowerShell for discovery + command line (no cwd available) ---
async function findWindowsHostNodeProcesses(): Promise<NodeProcess[]> {
  const listScript =
    "Get-NetTCPConnection -State Listen | ForEach-Object { " +
    "$p = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue; " +
    "if ($p -and $p.ProcessName -match 'node') { \"$($_.OwningProcess):$($_.LocalPort)\" } }";
  const stdout = await runPowerShell(listScript);
  const pairs = [
    ...new Set(
      stdout
        .trim()
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean),
    ),
  ];

  const procs: NodeProcess[] = [];
  for (const pair of pairs) {
    const [pid, port] = pair.split(":");
    if (!pid || !port) continue;
    let command = "";
    try {
      command = (await runPowerShell(`(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`)).trim();
    } catch {
      command = "node";
    }
    procs.push({ pid, port, source: "host", command: command || "node", workingDir: null });
  }
  return procs;
}

// --- WSL: enumerate node listeners inside each running distro via wsl.exe ---
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
  'case "$cmd" in *node*) ;; *) continue ;; esac; ' +
  "cwd=$(readlink /proc/$pid/cwd 2>/dev/null); " +
  'echo "$port|$pid|$cwd|$cmd"; ' +
  "done";

function wslToUnc(distro: string, linuxPath: string): string {
  return `\\\\wsl.localhost\\${distro}${linuxPath.replace(/\//g, "\\")}`;
}

async function findWslNodeProcesses(): Promise<NodeProcess[]> {
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

  const all: NodeProcess[] = [];
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
