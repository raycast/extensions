import { getPreferenceValues } from "@raycast/api";
import { existsSync } from "fs";
import { arch } from "os";

import { cachedCliPath } from "./paths";

const HOMEBREW_PATHS = ["/opt/homebrew/bin/macwifi-cli", "/usr/local/bin/macwifi-cli"];

function isExecutable(filePath: string): boolean {
  return Boolean(filePath) && existsSync(filePath);
}

/** Prefer an already-installed binary; return null when the CLI must be downloaded. */
export function resolveExistingCli(): string | null {
  const { macwifiCliPath } = getPreferenceValues<Preferences>();
  const preferencePath = macwifiCliPath?.trim();
  if (preferencePath && isExecutable(preferencePath)) {
    return preferencePath;
  }

  const cached = cachedCliPath();
  if (isExecutable(cached)) {
    return cached;
  }

  for (const candidate of HOMEBREW_PATHS) {
    if (isExecutable(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function isAppleSilicon(): boolean {
  return arch() === "arm64";
}
