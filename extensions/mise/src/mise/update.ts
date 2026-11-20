import { realpathSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { MiseLocation } from "./locate";
import { compareVersions, type MiseVersion } from "./version";

export type InstallMethod = "homebrew" | "self-managed" | "unknown";
export type InstallPaths = { path: string; realPath?: string; home: string; installPath?: string };
// Without an `argv` there is no known update command, so the user is sent to INSTALL_DOCS_URL.
export type MiseUpdate = { current: string; latest: string; argv?: string[] };

export const INSTALL_DOCS_URL = "https://mise.jdx.dev/installing-mise.html";

// mise itself treats any canonical path with a Cellar component as Homebrew (is_homebrew_install),
// and `mise self-update` refuses those installs.
function isHomebrewPath(path: string): boolean {
  return path.startsWith("/opt/homebrew/") || path.startsWith("/usr/local/Cellar/") || path.includes("/Cellar/mise/");
}

// mise.run installs to $MISE_INSTALL_PATH, else ~/.local/bin/mise.
export function installMethod({ path, realPath, home, installPath }: InstallPaths): InstallMethod {
  const paths = realPath ? [path, realPath] : [path];
  if (paths.some(isHomebrewPath)) return "homebrew";
  const selfManaged = [join(home, ".local/bin/mise"), installPath].filter(Boolean);
  if (paths.some((p) => selfManaged.includes(p))) return "self-managed";
  return "unknown";
}

export function updateCommand(method: InstallMethod, location: Pick<MiseLocation, "path">): string[] | undefined {
  switch (method) {
    case "homebrew":
      return ["brew", "upgrade", "mise"];
    case "self-managed":
      return [location.path, "self-update", "--yes"];
    case "unknown":
      return undefined;
  }
}

// mise reports `latest` from 2026.10.22 on, and leaves it out when it is offline.
export function newerRelease(version: MiseVersion | undefined): string | undefined {
  const latest = version?.latest;
  return latest && compareVersions(latest, version.version) > 0 ? latest : undefined;
}

export function findMiseUpdate(location: MiseLocation): MiseUpdate | undefined {
  const latest = newerRelease(location.version);
  if (!location.version || !latest) return undefined;
  const method = installMethod({
    path: location.path,
    realPath: safeRealpath(location.path),
    home: homedir(),
    installPath: location.env.MISE_INSTALL_PATH,
  });
  return { current: location.version.version, latest, argv: updateCommand(method, location) };
}

function safeRealpath(path: string): string | undefined {
  try {
    return realpathSync(path);
  } catch {
    return undefined;
  }
}
