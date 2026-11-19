import * as os from "os";
import * as path from "path";
import * as fs from "fs";

export function getCurrentOS(): "windows" | "mac" | "linux" {
  if (process.platform === "win32") return "windows";
  if (process.platform === "darwin") return "mac";
  return "linux";
}

interface PathVars {
  home: string;
  osUserName: string;
  winAppData?: string;
  winLocalAppData?: string;
  winLocalAppDataLow?: string;
  winDocuments?: string;
  winPublic?: string;
  winProgramData?: string;
  winDir?: string;
  xdgData?: string;
  xdgConfig?: string;
}

function getPathVars(): PathVars {
  const home = os.homedir();
  const osUserName = os.userInfo().username;

  if (process.platform === "win32") {
    return {
      home,
      osUserName,
      winAppData: process.env.APPDATA ?? path.join(home, "AppData", "Roaming"),
      winLocalAppData:
        process.env.LOCALAPPDATA ?? path.join(home, "AppData", "Local"),
      winLocalAppDataLow: path.join(home, "AppData", "LocalLow"),
      winDocuments: path.join(home, "Documents"),
      winPublic: "C:\\Users\\Public",
      winProgramData: process.env.PROGRAMDATA ?? "C:\\ProgramData",
      winDir: process.env.WINDIR ?? "C:\\Windows",
    };
  }

  if (process.platform === "darwin") {
    return {
      home,
      osUserName,
      xdgData: path.join(home, ".local", "share"),
      xdgConfig: path.join(home, ".config"),
    };
  }

  // Linux
  return {
    home,
    osUserName,
    xdgData: process.env.XDG_DATA_HOME ?? path.join(home, ".local", "share"),
    xdgConfig: process.env.XDG_CONFIG_HOME ?? path.join(home, ".config"),
  };
}

// Resolves a manifest path template to a real filesystem path.
// Returns empty string if the template can't be fully resolved.
export function resolveTemplate(
  template: string,
  installPath?: string,
  storeRoot?: string,
  storeGameId?: string,
  storeUserId = "*",
): string {
  const vars = getPathVars();
  let result = template;

  // Game-relative placeholders require installPath
  if (/<(?:game|root|base)>/.test(result)) {
    if (!installPath) return "";
    const gameName = path.basename(installPath);
    const root = storeRoot ?? path.dirname(installPath);
    result = result.replace(/<game>/g, gameName);
    result = result.replace(/<root>/g, root);
    result = result.replace(/<base>/g, installPath);
  }

  result = result.replace(/<home>/g, vars.home);
  result = result.replace(/<osUserName>/g, vars.osUserName);
  result = result.replace(/<storeUserId>/g, storeUserId);
  // A wildcard here would match every other game's folder (e.g. Steam userdata), so an unknown ID skips the path.
  if (result.includes("<storeGameId>")) {
    if (!storeGameId) return "";
    result = result.replace(/<storeGameId>/g, storeGameId);
  }

  // Windows
  if (vars.winAppData)
    result = result.replace(/<winAppData>/g, vars.winAppData);
  if (vars.winLocalAppData)
    result = result.replace(/<winLocalAppData>/g, vars.winLocalAppData);
  if (vars.winLocalAppDataLow)
    result = result.replace(/<winLocalAppDataLow>/g, vars.winLocalAppDataLow);
  if (vars.winDocuments)
    result = result.replace(/<winDocuments>/g, vars.winDocuments);
  if (vars.winPublic) result = result.replace(/<winPublic>/g, vars.winPublic);
  if (vars.winProgramData)
    result = result.replace(/<winProgramData>/g, vars.winProgramData);
  if (vars.winDir) result = result.replace(/<winDir>/g, vars.winDir);

  // Linux / macOS
  if (vars.xdgData) result = result.replace(/<xdgData>/g, vars.xdgData);
  if (vars.xdgConfig) result = result.replace(/<xdgConfig>/g, vars.xdgConfig);

  // If any placeholder remains unresolved, skip this path
  if (/<\w+>/.test(result)) return "";

  // Normalize separators (manifest uses forward slashes)
  return path.normalize(result);
}

// Expands a path that may contain '*' wildcards into real existing paths.
// If no wildcards, returns the path as-is (even if it doesn't exist yet).
export function expandWildcardPath(p: string): string[] {
  if (!p.includes("*")) return [p];

  const sep = path.sep;
  const parts = p.split(sep);
  const wildcardIdx = parts.findIndex((part) => part.includes("*"));
  if (wildcardIdx < 0) return [p];

  const parent = parts.slice(0, wildcardIdx).join(sep) || sep;
  const pattern = parts[wildcardIdx];
  const remaining = parts.slice(wildcardIdx + 1);

  if (!fs.existsSync(parent)) return [];

  let entries: string[];
  try {
    entries = fs.readdirSync(parent);
  } catch {
    return [];
  }

  const regex = new RegExp(
    "^" +
      pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") +
      "$",
    "i",
  );
  const results: string[] = [];

  for (const entry of entries) {
    if (!regex.test(entry)) continue;
    const matched = path.join(parent, entry);
    if (remaining.length === 0) {
      results.push(matched);
    } else {
      const rest = path.join(matched, ...remaining);
      results.push(...expandWildcardPath(rest));
    }
  }

  return results;
}

// Resolves a template and expands wildcards. Returns [] if template can't be resolved.
export function resolveAndExpand(
  template: string,
  installPath?: string,
  storeRoot?: string,
  storeGameId?: string,
): string[] {
  const resolved = resolveTemplate(
    template,
    installPath,
    storeRoot,
    storeGameId,
  );
  if (!resolved) return [];
  const expanded = expandWildcardPath(resolved);
  if (expanded.length > 0 || !resolved.includes("*")) return expanded;

  // Only a final-segment wildcard may fall back to its parent; a middle one would hit a shared root like userdata.
  const parent = path.dirname(resolved);
  return parent.includes("*") ? [] : [parent];
}
