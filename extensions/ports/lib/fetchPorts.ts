import { exec } from "child_process";
import { showToast, Toast } from "@raycast/api";

interface PortInfo {
  localAddress: string;
  pid: string;
  processName?: string;
}

// Simple cache for process names
const processCache = new Map<string, string>();
let cacheTimestamp = 0;
const CACHE_DURATION = 30000; // 30 seconds

export const fetchPorts = (setPorts: (ports: PortInfo[]) => void, setLoading: (loading: boolean) => void) => {
  setLoading(true);

  // Use netstat command for TCP listening ports
  exec("netstat -ano -p tcp", { maxBuffer: 2 * 1024 * 1024 }, (error, stdout) => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error getting ports",
        message: "Could not execute netstat command",
      });
      setPorts([]);
      setLoading(false);
      return;
    }

    const ports: PortInfo[] = [];
    const pids = new Set<string>();
    const lines = stdout.split("\n");

    // Parse each line looking for TCP LISTENING ports
    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines and headers
      if (
        !trimmedLine ||
        trimmedLine.includes("Proto") ||
        trimmedLine.includes("Conexiones") ||
        trimmedLine.includes("activas") ||
        trimmedLine.includes("Dirección")
      ) {
        continue;
      }

      // Split by multiple spaces/tabs to handle formatting
      const parts = trimmedLine.split(/\s+/);

      // Must have at least 5 parts: Protocol, LocalAddr, RemoteAddr, State, PID
      if (parts.length >= 5) {
        const protocol = parts[0];
        const localAddress = parts[1];
        const state = parts[3];
        const pid = parts[4];

        // Check for TCP and LISTENING state (both English and Spanish)
        if (protocol === "TCP" && (state === "LISTENING" || state === "ESCUCHANDO") && pid && pid !== "0") {
          ports.push({ localAddress, pid });
          pids.add(pid);
        }
      }
    }

    // Check if we need fresh process names
    const now = Date.now();
    const cacheExpired = now - cacheTimestamp > CACHE_DURATION;

    if (cacheExpired || processCache.size === 0) {
      // Get process names
      exec("tasklist /fo csv /nh", { timeout: 8000, maxBuffer: 2 * 1024 * 1024 }, (processError, processStdout) => {
        if (!processError && processStdout) {
          processCache.clear();
          const processLines = processStdout.split("\n");

          // Parse tasklist CSV output
          for (const line of processLines) {
            if (line.trim()) {
              // Match CSV format: "ProcessName","PID","SessionName","Session#","MemUsage"
              const csvMatch = line.match(/"([^"]+)","(\d+)"/);
              if (csvMatch) {
                const processName = csvMatch[1];
                const processPid = csvMatch[2];
                processCache.set(processPid, processName);
              }
            }
          }
          cacheTimestamp = now;
        }

        // Assign process names to ports
        const portsWithNames = ports.map((port) => ({
          ...port,
          processName: processCache.get(port.pid) || "Unknown",
        }));

        setPorts(portsWithNames);
        setLoading(false);
      });
    } else {
      // Use cached process names
      const portsWithNames = ports.map((port) => ({
        ...port,
        processName: processCache.get(port.pid) || "Unknown",
      }));

      setPorts(portsWithNames);
      setLoading(false);
    }
  });
};

// Clear cache function
export const clearProcessCache = () => {
  processCache.clear();
  cacheTimestamp = 0;
};

// Get cache info for debugging
export const getCacheInfo = () => ({
  size: processCache.size,
  lastUpdate: cacheTimestamp,
  isExpired: Date.now() - cacheTimestamp > CACHE_DURATION,
});
