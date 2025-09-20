import { launchCommand, LaunchType, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execSync, spawn } from "node:child_process";

type Updates = {
  port?: number;
  directory?: string[];
  status: boolean;
};

type Process = {
  user: string;
  pid: number;
  cpu: number;
  mem: number;
  command: string;
};

export const DEFAULT_PORT = "8000";
export const DEFAULT_DIRECTORY = "~/Downloads";

async function update(updates: Updates, running: boolean) {
  if (updates.status) {
    await tryLaunchCommand("status", { running });
  }
}

async function tryLaunchCommand(commandName: string, context: { running: boolean }) {
  try {
    await launchCommand({ name: commandName, type: LaunchType.Background, context });
  } catch (error) {
    await showFailureToast(`Failed to launch command ${commandName}`, { message: String(error) });
  }
}

async function execCommand(shellCommand: string, updates: Updates, hudMessage?: string) {
  try {
    execSync(shellCommand);
    await update(updates, false);
    if (hudMessage) {
      await showHUD(hudMessage);
    }
  } catch (error) {
    showFailureToast(`Failed to execute command ${shellCommand}`, { message: String(error) });
  }
}

function checkPythonVersion(): boolean {
  try {
    const version = execSync("python3 --version").toString();
    const versionMatch = version.match(/Python (\d+)\.(\d+)\.(\d+)/);
    if (versionMatch) {
      const [major, minor] = versionMatch.slice(1, 3).map(Number);
      if (major > 3 || (major === 3 && minor >= 7)) {
        return true;
      }
    }
    showFailureToast("Python >= 3.7 is required");
    return false;
  } catch (error) {
    showFailureToast("python3 is not installed", { message: String(error) });
    return false;
  }
}

function expandUserHome(directory: string): string {
  return directory.startsWith("~") ? directory.replace("~", process.env.HOME || "") : directory;
}

export function isRunning(): boolean {
  try {
    const proc = getProcesses();
    return proc.length > 0;
  } catch {
    return false;
  }
}

export function getProcesses(): Process[] {
  const out = execSync(`ps aux | grep 'Python -m http.server' | grep -v grep | awk '{print $0}'`).toString();
  const lines = out.split("\n").filter((line) => line.trim() !== "");
  const processes = lines.map((line) => {
    const columns = line.split(/\s+/);
    return {
      user: columns[0],
      pid: Number(columns[1]),
      cpu: Number(columns[2]),
      mem: Number(columns[3]),
      command: columns.slice(10).join(" "),
    };
  });

  return processes ? processes : [];
}

export async function startServer(updates: Updates, hudMessage?: string) {
  if (!checkPythonVersion()) {
    return;
  }
  const proc = getProcesses();
  if (proc.length > 0) {
    throw new Error("Simple HTTP is already running");
  }
  try {
    const port = updates.port?.toString() || DEFAULT_PORT;
    const directory = updates.directory?.[0] || DEFAULT_DIRECTORY;
    const child = spawn("python3", ["-m", "http.server", port, "--directory", expandUserHome(directory)], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();

    await update(updates, true);
    if (hudMessage) {
      await showHUD(hudMessage);
    }
  } catch (error) {
    await showFailureToast(`Failed to start Simple HTTP`, { message: String(error) });
  }
}

export async function stopServer(updates: Updates, hudMessage?: string) {
  const proc = getProcesses();
  if (proc.length === 0) {
    throw new Error("Simple HTTP is not running");
  }
  await execCommand(`kill -9 ${proc.map((p) => p.pid).join(" ")}`, updates, hudMessage);
}
