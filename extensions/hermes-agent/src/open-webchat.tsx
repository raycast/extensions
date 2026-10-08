import { open, showToast, Toast } from "@raycast/api";
import { getPreferences } from "./api";
import { exec } from "child_process";
import { Socket } from "net";
import { promisify } from "util";
import os from "os";
import path from "path";

const execAsync = promisify(exec);

/**
 * Resolve the path to the hermes binary.
 * Hermes is typically installed at ~/.local/bin/hermes.
 */
function getHermesPath(): string {
  const hermesBinPath = path.join(os.homedir(), ".local", "bin", "hermes");
  return hermesBinPath;
}

export default async function Command() {
  try {
    const prefs = getPreferences<Preferences>();
    const apiUrl = new URL(prefs.endpoint);
    const hostname = apiUrl.hostname;
    const dashboardUrl = `http://${hostname}:9119`;

    // Check if port 9119 has a service running
    const isRunning = await checkPort(hostname, 9119);

    if (isRunning) {
      // Dashboard is already running, just open it
      await open(dashboardUrl);
      return;
    }

    // Dashboard is not running on this port
    // Only try to start it locally if the endpoint is localhost
    const isLocal =
      hostname === "127.0.0.1" ||
      hostname === "localhost" ||
      hostname === "0.0.0.0";

    if (!isLocal) {
      // Remote endpoint - can't start dashboard remotely
      throw new Error(
        `Dashboard is not running on ${hostname}:9119. Please start it manually on the remote machine.`,
      );
    }

    // Start dashboard locally
    await showToast({
      style: Toast.Style.Animated,
      title: "Starting Hermes Dashboard...",
      message: "Running hermes dashboard",
    });

    await startDashboard();

    // Wait for the dashboard to become available
    await showToast({
      style: Toast.Style.Animated,
      title: "Starting Hermes Dashboard...",
      message: "Waiting for dashboard to be ready",
    });

    await waitForPort("127.0.0.1", 9119, { timeout: 30000 });

    await open(dashboardUrl);

    await showToast({
      style: Toast.Style.Success,
      title: "Dashboard Opened",
      message: "Hermes dashboard is now running",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message:
        error instanceof Error ? error.message : "Failed to open webchat",
    });
  }
}

async function checkPort(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new Socket();
    socket.setTimeout(2000);
    socket.on("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => {
      resolve(false);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function waitForPort(
  host: string,
  port: number,
  options: { timeout: number; interval?: number },
): Promise<void> {
  const { timeout, interval = 500 } = options;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const isUp = await checkPort(host, port);
    if (isUp) return;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(
    `Dashboard did not become available on ${host}:${port} within ${timeout}ms. Try running: hermes dashboard`,
  );
}

async function startDashboard(): Promise<void> {
  const hermesPath = getHermesPath();

  // Use nohup with absolute path to hermes binary
  // Run in background so the command returns immediately
  const command = `nohup "${hermesPath}" dashboard --no-open > /dev/null 2>&1 &`;

  await execAsync(command, {
    timeout: 5000,
    // Ensure we have a minimal PATH that includes standard system locations
    env: {
      ...process.env,
      PATH: `${path.dirname(hermesPath)}:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ""}`,
    },
  });
}
