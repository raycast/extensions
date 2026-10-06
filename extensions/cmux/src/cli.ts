import { execFile } from "child_process";
import { homedir } from "os";

// Installing the cmux CLI into PATH is optional, but the app always bundles it,
// so fall back to the bundled copy after any user-installed one.
const bundledCliPaths = [
  "/Applications/cmux.app/Contents/Resources/bin",
  `${homedir()}/Applications/cmux.app/Contents/Resources/bin`,
];

const expandedEnv = {
  ...process.env,
  PATH: [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    process.env.PATH ?? "/usr/bin:/bin:/usr/sbin:/sbin",
    ...bundledCliPaths,
  ].join(":"),
};

export function execFileAsync(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { encoding: "utf8", env: expandedEnv }, (error, stdout) => {
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
