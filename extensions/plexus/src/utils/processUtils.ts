import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function findNodeProcesses(): Promise<string> {
  // Find all listening Node.js processes and extract PID:PORT pairs
  const command = "/usr/sbin/lsof -nP -iTCP -sTCP:LISTEN | grep node";

  try {
    const { stdout } = await execAsync(command);
    if (!stdout.trim()) {
      throw new Error("No localhost processes found");
    }

    // Parse lsof output to extract PID and port
    const lines = stdout.trim().split("\n");
    const pidPortPairs = lines
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
      .filter(Boolean)
      .join("\n");

    if (!pidPortPairs) {
      throw new Error("No localhost processes found");
    }

    return pidPortPairs;
  } catch {
    throw new Error("No localhost processes found");
  }
}

export async function getProcessCommand(pid: string): Promise<string> {
  const { stdout } = await execAsync(`ps -p ${pid} -o command=`);
  return stdout.trim();
}

export async function getWorkingDirectory(pid: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`lsof -p ${pid} | awk '$4=="cwd" {print $9}' | head -1`);
    const result = stdout.trim();

    return result && result.startsWith("/") ? result : null;
  } catch {
    return null;
  }
}
