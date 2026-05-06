import { accessSync, constants } from "fs";

const BREW_PATHS = ["/opt/homebrew/bin/brew", "/usr/local/bin/brew"];

let cachedBrewPath: string | null | undefined;

export async function getBrewPath(): Promise<string | null> {
  if (cachedBrewPath !== undefined) return cachedBrewPath;

  for (const p of BREW_PATHS) {
    try {
      accessSync(p, constants.X_OK);
      cachedBrewPath = p;
      return p;
    } catch {
      continue;
    }
  }
  cachedBrewPath = null;
  return null;
}
