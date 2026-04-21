import { execSync } from "node:child_process";

const awsmPath = "awsm";

const defaultEnv = {
  ...process.env,
  PATH: `/bin:/usr/bin:/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || ""}`,
  BROWSER: "/usr/bin/open",
};

export const FIREFOX_BUNDLE_IDS = [
  "org.mozilla.firefox",
  "org.mozilla.firefoxdeveloperedition",
  "org.mozilla.nightly",
  "app.zen-browser.zen",
];

export function execAwsm(command: string, mfaToken?: string): string {
  try {
    const result = execSync(`${awsmPath} ${command}`, {
      env: defaultEnv,
      input: mfaToken !== undefined ? mfaToken + "\n" : "",
      timeout: 30000,
    });
    return result.toString().trim();
  } catch (err: unknown) {
    const spawnErr = err as { stderr?: { toString(): string }; message?: string };
    const stderr = spawnErr.stderr?.toString().trim();
    const message = stderr || spawnErr.message || String(err);
    console.error("Error executing awsm command:", message);
    throw new Error(message);
  }
}

export function getDefaultBrowserBundleId(): string | undefined {
  try {
    const launchServicesPath = `${process.env.HOME}/Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure.plist`;
    const result = execSync(`/usr/bin/plutil -extract LSHandlers json -o - "${launchServicesPath}"`);
    const handlers = JSON.parse(result.toString()) as Array<Record<string, string>>;
    const handler = handlers.find((entry) => entry.LSHandlerURLScheme === "https")
      || handlers.find((entry) => entry.LSHandlerURLScheme === "http");

    return handler?.LSHandlerRoleAll;
  } catch (err) {
    console.error("Error reading default browser:", err);
    return undefined;
  }
}

export function openUrlWithBundleId(url: string, bundleId: string): void {
  if (process.platform === "darwin") {
    execSync(`/usr/bin/open -b "${bundleId}" "${url}"`);
  } else if (process.platform === "win32") {
    // Windows does not support macOS bundle identifiers; open with the default handler.
    execSync(`start "" "${url}"`, { shell: "cmd.exe" });
  } else {
    // Fallback for other platforms: open with the default handler if available.
    execSync(`open "${url}"`);
  }
}