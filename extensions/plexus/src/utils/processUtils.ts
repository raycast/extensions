import { exec, execFile } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

const isWindows = process.platform === "win32";

// Run a PowerShell command on Windows. Using execFile avoids cmd.exe quoting issues.
async function runPowerShell(script: string): Promise<string> {
  const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script]);
  return stdout;
}

export async function findNodeProcesses(): Promise<string> {
  try {
    let pairs: string[];

    if (isWindows) {
      // List listening TCP ports owned by a "node" process and emit PID:PORT lines.
      const script =
        "Get-NetTCPConnection -State Listen | ForEach-Object { " +
        "$p = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue; " +
        "if ($p -and $p.ProcessName -match 'node') { \"$($_.OwningProcess):$($_.LocalPort)\" } }";
      const stdout = await runPowerShell(script);
      pairs = stdout
        .trim()
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    } else {
      // Find all listening Node.js processes and extract PID:PORT pairs.
      const { stdout } = await execAsync("/usr/sbin/lsof -nP -iTCP -sTCP:LISTEN | grep node");
      pairs = stdout
        .trim()
        .split("\n")
        .map((line) => {
          const parts = line.split(/\s+/);
          const pid = parts[1];
          const networkField = parts.find((part) => part.includes(":") && part.includes("->") === false);

          if (networkField) {
            const portMatch = networkField.match(/:(\d+)$/);
            if (portMatch && portMatch[1]) {
              return `${pid}:${portMatch[1]}`;
            }
          }
          return null;
        })
        .filter((pair): pair is string => Boolean(pair));
    }

    // A server listening on both IPv4 and IPv6 yields duplicate PID:PORT lines; dedupe them.
    const pidPortPairs = [...new Set(pairs)].join("\n");

    if (!pidPortPairs) {
      throw new Error("No localhost processes found");
    }

    return pidPortPairs;
  } catch {
    throw new Error("No localhost processes found");
  }
}

export async function getProcessCommand(pid: string): Promise<string> {
  if (isWindows) {
    const stdout = await runPowerShell(`(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`);
    return stdout.trim();
  }

  const { stdout } = await execAsync(`ps -p ${pid} -o command=`);
  return stdout.trim();
}

export async function getWorkingDirectory(pid: string): Promise<string | null> {
  // Windows exposes no per-process working directory without extra native tooling.
  // Callers fall back to deriving the project path from the command line instead.
  if (isWindows) {
    return null;
  }

  try {
    const { stdout } = await execAsync(`lsof -p ${pid} | awk '$4=="cwd" {print $9}' | head -1`);
    const result = stdout.trim();

    return result && result.startsWith("/") ? result : null;
  } catch {
    return null;
  }
}
