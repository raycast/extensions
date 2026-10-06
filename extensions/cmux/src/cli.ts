import { getApplications } from "@raycast/api";
import { execFile } from "child_process";

const basePath = ["/opt/homebrew/bin", "/usr/local/bin", process.env.PATH ?? "/usr/bin:/bin:/usr/sbin:/sbin"].join(":");

const bundleId = "com.cmuxterm.app";

let installedAppPath: string | undefined;

// Prefer the running copy so the CLI and `open` target the same app when more than one cmux.app exists
// (for example one still running from the mounted installer disk).
async function getCmuxAppPath(): Promise<string | undefined> {
  const runningAppPath = await new Promise<string | undefined>((resolve) => {
    execFile("/usr/bin/lsappinfo", ["info", "-only", "bundlepath", bundleId], { encoding: "utf8" }, (error, stdout) =>
      resolve(error ? undefined : stdout.match(/bundle path="([^"]+)"/)?.[1]),
    );
  });
  if (runningAppPath) {
    return runningAppPath;
  }

  installedAppPath ??= await getApplications()
    .then((apps) => apps.find((app) => app.bundleId === bundleId)?.path)
    .catch(() => undefined);
  return installedAppPath;
}

// Installing the cmux CLI into PATH is optional, but the app always bundles it,
// so fall back to the bundled copy after any user-installed one.
async function getExpandedEnv(): Promise<NodeJS.ProcessEnv> {
  const path = await getCmuxAppPath();
  return {
    ...process.env,
    PATH: path ? `${basePath}:${path}/Contents/Resources/bin` : basePath,
  };
}

export async function execFileAsync(command: string, args: string[]): Promise<string> {
  const env = await getExpandedEnv();
  return new Promise((resolve, reject) => {
    execFile(command, args, { encoding: "utf8", env }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(stdout);
    });
  });
}

export async function openCmuxApp() {
  const path = await getCmuxAppPath();
  await execFileAsync("open", path ? [path] : ["-a", "cmux"]);
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

// cmux's default Socket Control Mode only accepts processes started inside cmux.
export function getCmuxErrorView(error: Error): { title: string; description: string } {
  if (error.message.includes("Access denied")) {
    return {
      title: "cmux blocked Raycast",
      description: "Set Socket Control Mode to Automation mode in cmux Settings → Automation.",
    };
  }

  return { title: "cmux is not running", description: error.message };
}
