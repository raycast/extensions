import { showToast, Toast, LaunchProps, showHUD } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface Arguments {
  portNumber: string;
}

interface PortProcess {
  pid: string;
  processName: string;
  localAddress: string;
}

// Cache for process names with 10-second TTL for fast lookups
const processNameCache = new Map<string, { name: string; timestamp: number }>();
const CACHE_TTL = 10000; // 10 seconds

// Pre-compiled regex patterns for maximum performance
const TCP_LISTENING_REGEX = /^TCP\s+(\S+)\s+\S+\s+(LISTENING|ESCUCHANDO)\s+(\d+)$/;
const PROCESS_CSV_REGEX = /"([^"]+)","(\d+)"/;

export default async function KillPort(props: LaunchProps<{ arguments: Arguments }>) {
  const { portNumber } = props.arguments;

  // Clean and validate port number
  const cleanPort = portNumber.trim().replace(/[^0-9]/g, "");
  const port = parseInt(cleanPort);

  if (!cleanPort || isNaN(port) || port < 1 || port > 65535) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid Port Number",
      message: `"${portNumber}" is not a valid port. Use a number between 1-65535`,
    });
    return;
  }

  // Check for common system ports and warn
  const systemPorts = [80, 443, 22, 21, 25, 53, 110, 993, 995, 135, 445];
  if (systemPorts.includes(port)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "System Port Warning",
      message: `Port ${port} is a system/service port. Operation cancelled for safety.`,
    });
    return;
  }

  // Show loading toast with instant feedback
  const loadingToast = await showToast({
    style: Toast.Style.Animated,
    title: "⚡ Searching...",
    message: `Looking for process on port ${port}`,
  });

  try {
    // Find process using the port with robust error handling
    const portProcess = await findProcessUsingPortRobust(port);

    if (!portProcess) {
      loadingToast.hide();
      await showHUD(`✅ Port ${port} is already free`);
      return;
    }

    // Update toast to show terminating
    loadingToast.title = "💥 Terminating...";
    loadingToast.message = `Killing process in port ${port} (PID: ${portProcess.pid})`;

    // Kill the process
    const success = await killProcessOptimized(portProcess.pid);

    loadingToast.hide();

    if (success) {
      // Success - show HUD for quick feedback
      await showHUD(`🚀 Port ${port} freed! Process terminated`);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "❌ Failed to Kill Process",
        message: `Could not terminate process in port ${port}. Try running as administrator.`,
      });
    }
  } catch (error) {
    loadingToast.hide();
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : "An unexpected error occurred",
    });
  }
}

async function findProcessUsingPortRobust(port: number): Promise<PortProcess | null> {
  try {
    // First check cache for recent data
    const cachedResult = getCachedPortProcess(port);
    if (cachedResult) {
      return cachedResult;
    }

    // Try primary method with netstat
    let netstatOutput = "";
    let processOutput = "";

    try {
      // Execute both commands with better error handling
      const [netstatResult, tasklistResult] = await Promise.allSettled([
        execAsync(`netstat -ano -p tcp`, {
          timeout: 8000,
          maxBuffer: 2 * 1024 * 1024,
          windowsHide: true,
        }),
        execAsync(`tasklist /fo csv /nh`, {
          timeout: 8000,
          maxBuffer: 2 * 1024 * 1024,
          windowsHide: true,
        }),
      ]);

      if (netstatResult.status === "fulfilled") {
        netstatOutput = netstatResult.value.stdout;
      }

      if (tasklistResult.status === "fulfilled") {
        processOutput = tasklistResult.value.stdout;
      }
    } catch (error) {
      console.error("Command execution error:", error);
    }

    // If primary netstat failed, try alternative approach
    if (!netstatOutput) {
      try {
        const alternativeResult = await execAsync(`netstat -ano | findstr :${port}`, {
          timeout: 5000,
          maxBuffer: 1024 * 1024,
          windowsHide: true,
        });
        netstatOutput = alternativeResult.stdout;
      } catch {
        throw new Error(`Failed to find process using port ${port}. Try running as administrator.`);
      }
    }

    if (!netstatOutput || netstatOutput.trim().length === 0) {
      return null;
    }

    // Build process name mapping
    const processMap = new Map<string, string>();
    if (processOutput) {
      const now = Date.now();
      const processLines = processOutput.split("\n");

      for (const line of processLines) {
        if (line.trim()) {
          const match = PROCESS_CSV_REGEX.exec(line);
          if (match) {
            const [, processName, pid] = match;
            processMap.set(pid, processName);
            // Update cache with fresh data
            processNameCache.set(pid, { name: processName, timestamp: now });
          }
        }
      }
    }

    // Parse netstat output to find our target port
    const lines = netstatOutput.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Skip header lines
      if (
        trimmedLine.includes("Proto") ||
        trimmedLine.includes("Conexiones") ||
        trimmedLine.includes("activas") ||
        trimmedLine.includes("Dirección")
      ) {
        continue;
      }

      // Try regex parsing first
      const match = TCP_LISTENING_REGEX.exec(trimmedLine);
      let localAddress = "";
      let pid = "";

      if (match) {
        localAddress = match[1];
        pid = match[3];
      } else {
        // Fallback to manual parsing
        const parts = trimmedLine.split(/\s+/);
        if (parts.length >= 5 && parts[0] === "TCP") {
          const addr = parts[1];
          const state = parts[3];
          const processId = parts[4];

          if ((state === "LISTENING" || state === "ESCUCHANDO") && addr.endsWith(`:${port}`) && processId !== "0") {
            localAddress = addr;
            pid = processId;
          }
        }
      }

      // Check if this matches our target port
      if (localAddress.endsWith(`:${port}`) && pid !== "0") {
        // Get process name from our cache/map
        let processName = processMap.get(pid) || getCachedProcessName(pid) || "Unknown Process";

        // If we still don't have a name, try a quick direct lookup
        if (processName === "Unknown Process") {
          try {
            const { stdout } = await execAsync(`tasklist /fo csv /nh /fi "PID eq ${pid}"`, {
              timeout: 3000,
              windowsHide: true,
            });
            const directMatch = stdout.match(/"([^"]+)"/);
            if (directMatch) {
              processName = directMatch[1];
              // Cache this for future use
              processNameCache.set(pid, { name: processName, timestamp: Date.now() });
            }
          } catch {
            // Ignore errors, keep "Unknown Process"
          }
        }

        const portProcess = {
          pid,
          processName,
          localAddress,
        };

        // Cache this result for future quick lookups
        cachePortProcess(port, portProcess);

        return portProcess;
      }
    }

    return null;
  } catch (error) {
    console.error("Port search error:", error);
    throw new Error(
      `Port search failed: ${error instanceof Error ? error.message : "Network command execution failed"}`,
    );
  }
}

function getCachedProcessName(pid: string): string | null {
  const cached = processNameCache.get(pid);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.name;
  }
  return null;
}

async function killProcessOptimized(pid: string): Promise<boolean> {
  try {
    // Try graceful termination first, then force kill if needed
    try {
      await execAsync(`taskkill /PID ${pid}`, {
        timeout: 3000,
        windowsHide: true,
      });
    } catch {
      // If graceful fails, try force kill
      await execAsync(`taskkill /PID ${pid} /F`, {
        timeout: 3000,
        windowsHide: true,
      });
    }
    // Clear cache entry for this PID
    processNameCache.delete(pid);
    return true;
  } catch (error) {
    console.error("Kill process failed:", error);
    return false;
  }
}

// Cache for port-to-process mapping with 5-second TTL
const portProcessCache = new Map<number, { process: PortProcess; timestamp: number }>();
const PORT_CACHE_TTL = 5000; // 5 seconds

function getCachedPortProcess(port: number): PortProcess | null {
  const cached = portProcessCache.get(port);
  if (cached && Date.now() - cached.timestamp < PORT_CACHE_TTL) {
    return cached.process;
  }
  portProcessCache.delete(port);
  return null;
}

function cachePortProcess(port: number, process: PortProcess): void {
  portProcessCache.set(port, { process, timestamp: Date.now() });
}

// Clean up expired cache entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    // Clean process name cache
    for (const [pid, entry] of processNameCache.entries()) {
      if (now - entry.timestamp >= CACHE_TTL) {
        processNameCache.delete(pid);
      }
    }
    // Clean port process cache
    for (const [port, entry] of portProcessCache.entries()) {
      if (now - entry.timestamp >= PORT_CACHE_TTL) {
        portProcessCache.delete(port);
      }
    }
  }, CACHE_TTL / 2); // Clean more frequently
}
