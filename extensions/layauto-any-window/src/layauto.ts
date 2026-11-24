import { getApplications, getPreferenceValues } from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

// Mirrors AnyWindowLauncherResponse in LayAutoCore. LayAuto 4 ranks results itself, including
// pinyin matching and recency, so this extension shows them in the order received.
export type AnyWindowItem = {
  id: string;
  kind: "window" | "deepWindow" | "session";
  title: string;
  subtitle: string;
  kindLabel: string;
  iconPath?: string;
};

export type AnyWindowResponse = {
  version: number;
  status: "loading" | "ready";
  items: AnyWindowItem[];
  selectedID?: string;
  loadingText?: string;
  failures: string[];
  emptyText?: string;
  /** Shown after the items when the free plan locks the remaining results. */
  upgradeText?: string;
  error?: { code: string; message: string };
};

const applicationPaths = ["/Applications/LayAuto 4.app", join(process.env.HOME ?? "", "Applications/LayAuto 4.app")];
const bundleIdentifiers = ["com.layautoapp.LayAuto4", "com.layautoapp.LayAuto4.dev"];
const toolPath = (applicationPath: string) => join(applicationPath, "Contents/MacOS/layauto");

let resolvedApplicationPath: Promise<string | undefined> | undefined;

/** Paths of running LayAuto 4 apps, whose tool reaches the same app it belongs to. */
function runningApplicationPaths(): Promise<string[]> {
  return new Promise((resolve) => {
    execFile("/bin/ps", ["-axo", "comm="], (_error, stdout) => {
      const suffix = "/Contents/MacOS/LayAuto4";
      resolve(
        (stdout ?? "")
          .split("\n")
          .filter((command) => command.endsWith(suffix))
          .map((command) => command.slice(0, -suffix.length)),
      );
    });
  });
}

/** The LayAuto 4 app that bundles the `layauto` tool: the chosen app, a running copy, a standard location, then any installed copy. */
export function findApplication(): Promise<string | undefined> {
  resolvedApplicationPath ??= (async () => {
    const { application } = getPreferenceValues<Preferences.SearchWindows>();
    const candidates = [application?.path, ...(await runningApplicationPaths()), ...applicationPaths].filter(
      (path): path is string => !!path,
    );
    const match = candidates.find((path) => existsSync(toolPath(path)));
    if (match) return match;
    const installed = await getApplications();
    return bundleIdentifiers
      .map((bundleId) => installed.find((app) => app.bundleId === bundleId)?.path)
      .find((path): path is string => !!path && existsSync(toolPath(path)));
  })();
  return resolvedApplicationPath;
}

export const missingApplicationResponse: AnyWindowResponse = {
  version: 1,
  status: "ready",
  items: [],
  failures: [],
  error: { code: "notInstalled", message: "Install LayAuto 4 to search windows from Raycast." },
};

/** Streams responses for one query until loading finishes. The returned function stops it. */
export function watchSearch(
  applicationPath: string,
  query: string,
  onResponse: (response: AnyWindowResponse) => void,
  onFinish: () => void,
): () => void {
  const child = spawn(toolPath(applicationPath), ["search", "--watch", "--", query]);
  let pending = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    pending += chunk;
    let newline = pending.indexOf("\n");
    while (newline >= 0) {
      const line = pending.slice(0, newline);
      pending = pending.slice(newline + 1);
      if (line) onResponse(JSON.parse(line) as AnyWindowResponse);
      newline = pending.indexOf("\n");
    }
  });
  child.on("error", () => onFinish());
  child.on("close", () => onFinish());
  return () => child.kill();
}

export function activate(applicationPath: string, id: string): Promise<AnyWindowResponse> {
  return run(applicationPath, ["activate", id]);
}

/** Opens LayAuto 4's License settings. */
export function showLicense(applicationPath: string): Promise<AnyWindowResponse> {
  return run(applicationPath, ["license"]);
}

function run(applicationPath: string, args: string[]): Promise<AnyWindowResponse> {
  return new Promise((resolve) => {
    execFile(toolPath(applicationPath), args, (_error, stdout) => {
      try {
        resolve(JSON.parse(stdout) as AnyWindowResponse);
      } catch {
        resolve({ ...missingApplicationResponse, error: { code: "notRunning", message: "LayAuto 4 did not answer." } });
      }
    });
  });
}
