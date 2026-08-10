import { getPreferenceValues } from "@raycast/api";
import { homedir } from "os";
import { join } from "path";

export function expandTildePath(inputPath: string): string {
  if (inputPath.startsWith("~/") || inputPath === "~") {
    return join(homedir(), inputPath.slice(1));
  }
  return inputPath;
}

export function getTryPath(): string {
  const { tryPath } = getPreferenceValues<Preferences>();
  return expandTildePath(tryPath);
}
