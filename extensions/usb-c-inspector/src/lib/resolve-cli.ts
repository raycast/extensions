import { getPreferenceValues } from "@raycast/api";
import { existsSync } from "fs";
import { arch } from "os";
import path from "path";

import { cachedCliPath } from "./paths";

const APP_HELPER_PATHS = [
  "/Applications/WhatCable.app/Contents/Helpers/whatcable",
  path.join(process.env.HOME ?? "", "Applications/WhatCable.app/Contents/Helpers/whatcable"),
];

const HOMEBREW_PATHS = ["/opt/homebrew/bin/whatcable", "/usr/local/bin/whatcable"];

function isExecutable(filePath: string): boolean {
  return Boolean(filePath) && existsSync(filePath);
}

/** Prefer an already-installed binary; return null when the CLI must be downloaded. */
export function resolveExistingCli(): string | null {
  const { whatcablePath } = getPreferenceValues<Preferences>();
  const preferencePath = whatcablePath?.trim();
  if (preferencePath && isExecutable(preferencePath)) {
    return preferencePath;
  }

  const cached = cachedCliPath();
  if (isExecutable(cached)) {
    return cached;
  }

  for (const candidate of [...APP_HELPER_PATHS, ...HOMEBREW_PATHS]) {
    if (isExecutable(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function isAppleSilicon(): boolean {
  return arch() === "arm64";
}
