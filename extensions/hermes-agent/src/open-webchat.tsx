import { open, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { accessSync, constants } from "fs";
import { Socket } from "net";
import os from "os";
import path from "path";
import { promisify } from "util";
import { getPreferences } from "./api";

const execAsync = promisify(exec);
const isWindows = process.platform === "win32";

/**
 * Locate the hermes launcher across install styles and platforms.
 * macOS: shell installer (~/.local/bin), Homebrew (/opt/homebrew/bin, /usr/local/bin)
 * Windows: pip (%APPDATA%\Python\Scripts), uv (%USERPROFILE%\.local\bin)
 * Linux: ~/.local/bin, /usr/local/bin
 */
function getHermesPath(): string {
  const home = os.homedir();
  const candidates = isWindows
    ? [
        path.join(home, ".local", "bin", "hermes.exe"),
        path.join(home, ".local", "bin", "hermes.bat"),
        path.join(process.env.APPDATA || "", "Python", "Scripts", "hermes.exe"),
        path.join(process.env.APPDATA || "", "Python", "Scripts", "hermes.bat"),
      ]
    : [
        path.join(home, ".local", "bin", "hermes"),
        "/opt/homebrew/bin/hermes",
        "/usr/local/bin/hermes",
      ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Try the next location.
    }
  }
  return candidates[0] || "hermes";
}

export default async function Command() {
  try {
    const prefs = getPreferences();
    const apiUrl = new URL(prefs.endpoint);
    const hostname = apiUrl.hostname;
    const port = parseInt(prefs.dashboardPort || "9119", 10) || 9119;
    const dashboardUrl = `http://${hostname}:${port}`;

    const isRunning = await checkPort(hostname, port);
    if (isRunning) {
      await open(dashboardUrl);
      return;
    }

    const isLocal =
      hostname === "127.0.0.1" ||
      hostname === "localhost" ||
      hostname === "0.0.0.0";

    if (!isLocal) {
      throw new Error(
        `No dashboard on ${hostname}:${port}. Start it on the remote machine with \`hermes dashboard\` (and expose the port, e.g. \`tailscale serve\`).`,
      );
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Starting Hermes Dashboard…",
      message: "Running hermes dashboard",
    });

    await startDashboard(port);

    await showToast({
      style: Toast.Style.Animated,
      title: "Starting Hermes Dashboard…",
      message: "Waiting for dashboard to be ready",
    });

    await waitForPort("127.0.0.1", port, { timeout: 30000 });
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

async function startDashboard(port: number): Promise<void> {
  const hermesPath = getHermesPath();
  const portArg = port !== 9119 ? ` --port ${port}` : "";

  if (isWindows) {
    // Windows: use start to launch detached, no nohup available
    const command = `start "" /B "${hermesPath}" dashboard --no-open${portArg} > NUL 2>&1`;
    await execAsync(command, {
      timeout: 5000,
      shell: "cmd.exe",
      env: {
        ...process.env,
        PATH: `${path.dirname(hermesPath)};${process.env.PATH || ""}`,
      },
    });
  } else {
    // macOS/Linux: nohup for detached background process
    const command = `nohup "${hermesPath}" dashboard --no-open${portArg} > /dev/null 2>&1 &`;
    await execAsync(command, {
      timeout: 5000,
      env: {
        ...process.env,
        PATH: `${path.dirname(hermesPath)}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ""}`,
      },
    });
  }
}
