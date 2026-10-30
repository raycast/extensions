import * as path from "node:path";
import * as os from "node:os";
import * as fs from "node:fs";

import { getPreferenceValues } from "@raycast/api";
import { resolveTargetApp } from "./target-app";

export const TARGET_APP = resolveTargetApp(
  getPreferenceValues<Preferences>().targetApp ?? "auto",
  os.homedir(),
  fs.existsSync,
);
export const GLAZE_APP_PATH = TARGET_APP.appPath;
export const IS_GLAZE_INSTALLED = TARGET_APP.installed;
export const URL_SCHEME = TARGET_APP.scheme;
export const APP_SUPPORT_BASE = path.join(
  os.homedir(),
  "Library/Application Support",
  TARGET_APP.bundleId,
);
export const APPS_DIR = path.join(APP_SUPPORT_BASE, "apps");
export const BUNDLED_APPS_DIRS = [
  "/Applications",
  path.join(os.homedir(), "Applications"),
].map((root) => path.join(root, TARGET_APP.folderName));

export function getProjectRoots(): string[] {
  let settings: { projectsRoot?: string; pendingRelocationRoots?: string[] } =
    {};
  try {
    const parsed = JSON.parse(
      fs.readFileSync(
        path.join(APP_SUPPORT_BASE, "glaze-settings.json"),
        "utf8",
      ),
    );
    if (parsed && typeof parsed === "object") settings = parsed;
  } catch {
    /* A new installation has no settings yet. */
  }
  const expand = (value: string) =>
    path.resolve(value.replace(/^~(?=\/|$)/, os.homedir()));
  return [
    ...new Set(
      [
        (typeof settings.projectsRoot === "string" &&
          settings.projectsRoot.trim()) ||
          path.join(os.homedir(), TARGET_APP.folderName),
        ...(Array.isArray(settings.pendingRelocationRoots)
          ? settings.pendingRelocationRoots
          : []),
        APPS_DIR,
      ]
        .filter(
          (root): root is string => typeof root === "string" && !!root.trim(),
        )
        .map(expand),
    ),
  ];
}
