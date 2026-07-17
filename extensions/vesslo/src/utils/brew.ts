import { existsSync } from "fs";

const BREW_PATH_CANDIDATES = ["/opt/homebrew/bin/brew", "/usr/local/bin/brew"];
const BREW_CASK_TOKEN_PATTERN = /^[a-z0-9][a-z0-9._+@-]*$/i;

/**
 * Detect Homebrew path based on CPU architecture
 * Apple Silicon: /opt/homebrew/bin/brew
 * Intel: /usr/local/bin/brew
 */
export function getBrewPath(): string | null {
  for (const brewPath of BREW_PATH_CANDIDATES) {
    if (existsSync(brewPath)) {
      return brewPath;
    }
  }
  return null;
}

export function normalizeBrewCaskToken(
  caskName: string | null | undefined,
): string | null {
  if (typeof caskName !== "string") {
    return null;
  }

  const normalized = caskName.trim();
  if (!BREW_CASK_TOKEN_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
}

export function isValidBrewCaskToken(
  caskName: string | null | undefined,
): boolean {
  return normalizeBrewCaskToken(caskName) !== null;
}
