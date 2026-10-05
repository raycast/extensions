import { existsSync } from "node:fs";
import { isAbsolute } from "node:path";

export class CliMissingError extends Error {}

export function resolveCliPath(
  preferencePath?: string,
  pathExists: (path: string) => boolean = existsSync,
): string {
  const configuredPath = preferencePath?.trim();

  if (configuredPath && !isAbsolute(configuredPath)) {
    throw new CliMissingError(
      "The custom 1Password CLI path must be an absolute path.",
    );
  }

  const path = [configuredPath, "/opt/homebrew/bin/op", "/usr/local/bin/op"]
    .filter((candidate): candidate is string => Boolean(candidate))
    .find(pathExists);

  if (!path) {
    throw new CliMissingError(
      "1Password CLI was not found. Install it or set its path in preferences.",
    );
  }
  return path;
}
