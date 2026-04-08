import { exec, execFile } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export interface RunningApp {
  name: string;
  pid: string;
  bundleId?: string;
  bundlePath?: string;
}

export function parseLsappinfoOutput(stdout: string): RunningApp[] {
  const apps: RunningApp[] = [];
  // Each entry starts with: " N) "AppName" ASN:..." — split on that prefix
  const blocks = stdout.split(/\n\s*\d+\)\s+/);

  for (const block of blocks) {
    if (!block.trim()) continue;
    // Only include foreground (user-visible) apps; type appears on the pid line
    if (!block.includes('type="Foreground"')) continue;

    // After splitting, each block begins with: "AppName" ASN:...
    const nameMatch = block.match(/^"([^"]+)"/);
    const pidMatch = block.match(/pid\s*=\s*(\d+)/);
    const bundleMatch = block.match(/bundleID="([^"]+)"/);
    const pathMatch = block.match(/bundle path="([^"]+)"/);

    if (!nameMatch || !pidMatch) continue;

    apps.push({
      name: nameMatch[1],
      pid: pidMatch[1],
      bundleId: bundleMatch?.[1],
      bundlePath: pathMatch?.[1],
    });
  }

  const excluded = new Set([
    "Dock",
    "SystemUIServer",
    "WindowServer",
    "loginwindow",
  ]);
  return apps
    .filter((a) => !excluded.has(a.name))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getRunningApps(): Promise<RunningApp[]> {
  // lsappinfo needs no Automation permissions and lists all running GUI apps
  const { stdout } = await execAsync("lsappinfo list 2>/dev/null");
  return parseLsappinfoOutput(stdout);
}

export async function restartApp(app: RunningApp): Promise<void> {
  // Force-kill the process
  await execAsync(`kill -9 ${app.pid}`);

  // Brief pause to let the OS release resources
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Relaunch: prefer bundle ID, fall back to app name
  if (app.bundleId) {
    await execFileAsync("open", ["-b", app.bundleId]);
  } else {
    await execFileAsync("open", ["-a", app.name]);
  }
}
