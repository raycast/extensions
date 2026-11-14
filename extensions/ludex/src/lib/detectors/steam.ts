import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { InstalledGame } from "../types";

// Minimal VDF (Valve Data Format) parser
function parseVdf(content: string): Record<string, unknown> {
  const tokens: string[] = [];
  let i = 0;

  while (i < content.length) {
    const ch = content[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === "/" && content[i + 1] === "/") {
      while (i < content.length && content[i] !== "\n") i++;
      continue;
    }
    if (ch === '"') {
      let str = "";
      i++;
      while (i < content.length && content[i] !== '"') {
        if (content[i] === "\\" && i + 1 < content.length) {
          i++;
          str +=
            content[i] === "n" ? "\n" : content[i] === "t" ? "\t" : content[i];
        } else {
          str += content[i];
        }
        i++;
      }
      i++;
      tokens.push(str);
    } else if (ch === "{" || ch === "}") {
      tokens.push(ch);
      i++;
    } else {
      let tok = "";
      while (i < content.length && !/[\s{}]/.test(content[i]))
        tok += content[i++];
      if (tok) tokens.push(tok);
    }
  }

  function parseObj(pos: { i: number }): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    while (pos.i < tokens.length) {
      const token = tokens[pos.i];
      if (token === "}") {
        pos.i++;
        break;
      }
      const key = token.toLowerCase();
      pos.i++;
      if (pos.i >= tokens.length) break;
      if (tokens[pos.i] === "{") {
        pos.i++;
        obj[key] = parseObj(pos);
      } else {
        obj[key] = tokens[pos.i++];
      }
    }
    return obj;
  }

  const pos = { i: 0 };
  if (tokens[0] !== "{") pos.i++; // skip root key
  if (tokens[pos.i] === "{") pos.i++; // skip opening brace
  return parseObj(pos);
}

function getSteamRoot(): string | null {
  if (process.platform === "win32") {
    try {
      const out = execSync(
        String.raw`reg query "HKCU\SOFTWARE\Valve\Steam" /v SteamPath`,
        {
          encoding: "utf-8",
          timeout: 3000,
          stdio: ["ignore", "pipe", "ignore"],
        },
      );
      const match = out.match(/SteamPath\s+REG_SZ\s+(.+)/i);
      if (match) return match[1].trim().replace(/\//g, "\\");
    } catch {
      /* fall through */
    }
    for (const p of [
      "C:\\Program Files (x86)\\Steam",
      "C:\\Program Files\\Steam",
    ]) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  if (process.platform === "darwin") {
    const p = path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "Steam",
    );
    return fs.existsSync(p) ? p : null;
  }

  // Linux
  for (const p of [
    path.join(os.homedir(), ".steam", "steam"),
    path.join(os.homedir(), ".local", "share", "Steam"),
  ]) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function getLibraryPaths(steamRoot: string): string[] {
  const vdfPath = path.join(steamRoot, "steamapps", "libraryfolders.vdf");
  const fallback = [path.join(steamRoot, "steamapps")];
  if (!fs.existsSync(vdfPath)) return fallback;

  try {
    const vdf = parseVdf(fs.readFileSync(vdfPath, "utf-8")) as Record<
      string,
      Record<string, string>
    >;
    const paths: string[] = [];
    for (const value of Object.values(vdf)) {
      if (typeof value === "object" && value.path) {
        const libraryApps = path.join(value.path, "steamapps");
        paths.push(libraryApps);
      }
    }
    return paths.length > 0 ? paths : fallback;
  } catch {
    return fallback;
  }
}

interface SteamAcf {
  appid: string;
  name: string;
  installdir: string;
}

function readAcfFiles(steamAppsPath: string): SteamAcf[] {
  if (!fs.existsSync(steamAppsPath)) return [];
  const results: SteamAcf[] = [];
  try {
    const entries = fs.readdirSync(steamAppsPath);
    for (const entry of entries) {
      if (!entry.startsWith("appmanifest_") || !entry.endsWith(".acf"))
        continue;
      try {
        const data = parseVdf(
          fs.readFileSync(path.join(steamAppsPath, entry), "utf-8"),
        ) as Record<string, string>;
        if (data.appid && data.name && data.installdir) {
          results.push({
            appid: data.appid,
            name: data.name,
            installdir: data.installdir,
          });
        }
      } catch {
        /* skip malformed manifest */
      }
    }
  } catch {
    /* ignore */
  }
  return results;
}

// The client icon is stored under its content hash (40 hex chars); logo and header are wide fallbacks.
function findLibraryArt(steamRoot: string, appId: string): string | undefined {
  const dir = path.join(steamRoot, "appcache", "librarycache", appId);
  try {
    const hashed = fs
      .readdirSync(dir)
      .find((f) => /^[0-9a-f]{40}\.jpg$/i.test(f));
    if (hashed) return path.join(dir, hashed);
    for (const fallback of ["logo.png", "header.jpg"]) {
      const file = path.join(dir, fallback);
      if (fs.existsSync(file)) return file;
    }
  } catch {
    /* no cached artwork */
  }
  return undefined;
}

export async function detectSteamGames(): Promise<InstalledGame[]> {
  const steamRoot = getSteamRoot();
  if (!steamRoot) return [];

  const games: InstalledGame[] = [];
  for (const libraryPath of getLibraryPaths(steamRoot)) {
    for (const acf of readAcfFiles(libraryPath)) {
      games.push({
        name: acf.name,
        store: "steam",
        storeGameId: acf.appid,
        installPath: path.join(libraryPath, "common", acf.installdir),
        storeRoot: path.dirname(libraryPath),
        launchTarget: `steam://rungameid/${acf.appid}`,
        iconPath: findLibraryArt(steamRoot, acf.appid),
      });
    }
  }
  return games;
}
