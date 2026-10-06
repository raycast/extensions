import { getApplications } from "@raycast/api";
import { execFile } from "child_process";

const basePath = ["/opt/homebrew/bin", "/usr/local/bin", process.env.PATH ?? "/usr/bin:/bin:/usr/sbin:/sbin"].join(":");

let appPath: string | undefined;

// Installing the cmux CLI into PATH is optional, but the app always bundles it,
// so fall back to the bundled copy after any user-installed one.
async function getExpandedEnv(): Promise<NodeJS.ProcessEnv> {
  appPath ??= await getApplications()
    .then((apps) => apps.find((app) => app.bundleId === "com.cmuxterm.app")?.path)
    .catch(() => undefined);
  return {
    ...process.env,
    PATH: appPath ? `${basePath}:${appPath}/Contents/Resources/bin` : basePath,
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
  await execFileAsync("open", ["-a", "cmux"]);
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
