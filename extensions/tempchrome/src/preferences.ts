import * as os from "node:os";
import * as path from "node:path";
import { getPreferenceValues } from "@raycast/api";

export type ResolvedPreferences = {
  installDir: string;
  appBundlePath: string;
  binaryPath: string;
  tempBaseDir: string;
};

function expandTilde(inputPath: string): string {
  if (inputPath === "~") {
    return os.homedir();
  }
  if (inputPath.startsWith("~/")) {
    return path.join(os.homedir(), inputPath.slice(2));
  }
  return inputPath;
}

export function getPreferences(): ResolvedPreferences {
  const raw = getPreferenceValues<Preferences>();
  const installDir = expandTilde(raw.chromiumInstallDir);
  const appBundlePath = path.join(installDir, "Chromium.app");
  const binaryPath = path.join(appBundlePath, "Contents", "MacOS", "Chromium");
  return {
    installDir,
    appBundlePath,
    binaryPath,
    tempBaseDir: expandTilde(raw.tempBaseDir),
  };
}
