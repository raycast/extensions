import { existsSync, readdirSync } from 'fs';
import { readFileSync } from 'fs';
import { join } from 'path';
import { executeCommand } from './index';
import { parseVDF } from './vdf';

export interface SteamPaths {
  steamPath: string; // root Steam install
  steamExe: string; // steam.exe path
  configPath: string; // <SteamPath>\config
}

// Safe string extractor for loosely-typed VDF objects
function getStr(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return typeof v === 'string' ? v : String(v ?? '');
}

export function listSteamUsersSync(paths: SteamPaths): SteamUser[] {
  const loginUsersPath = join(paths.configPath, 'loginusers.vdf');
  if (!existsSync(loginUsersPath)) return [];
  try {
    const raw = readFileSync(loginUsersPath, 'utf8');
    const v = parseVDF(raw);
    const root = (v['users'] || v) as Record<string, unknown>;
    const users: SteamUser[] = [];
    for (const key of Object.keys(root)) {
      const u = root[key];
      if (!u || typeof u !== 'object') continue;
      const uobj = u as Record<string, unknown>;
      users.push({
        steamId64: key,
        accountName: getStr(uobj, 'AccountName'),
        personaName: getStr(uobj, 'PersonaName'),
        mostRecent: getStr(uobj, 'MostRecent') === '1',
        rememberPassword: getStr(uobj, 'RememberPassword') === '1',
      });
    }
    return users;
  } catch {
    return [];
  }
}

export async function restartSteam(paths?: SteamPaths): Promise<void> {
  const p = paths ?? (await getSteamInstallPath());
  if (!p) throw new Error('Steam installation not found');
  // Kill steam if running, ignore error if not running
  try {
    await executeCommand(`taskkill /IM steam.exe /F`);
  } catch {
    // ignore if Steam isn't running
  }
  // Start Steam
  await executeCommand(`start "" "${p.steamExe}"`);
}

export async function openSteam(paths?: SteamPaths): Promise<void> {
  const p = paths ?? (await getSteamInstallPath());
  if (!p) throw new Error('Steam installation not found');
  await executeCommand(`start "" "${p.steamExe}"`);
}

export async function openSteamConfigFolder(paths?: SteamPaths): Promise<void> {
  const p = paths ?? (await getSteamInstallPath());
  if (!p) throw new Error('Steam installation not found');
  // Use Windows 'start' for reliability
  await executeCommand(`start "" "${p.configPath}"`);
}

export async function logoutSteam(): Promise<void> {
  // Attempt to trigger Steam logout via protocol handler. If not supported, this may no-op.
  try {
    await executeCommand(`start "" "steam://logout"`);
  } catch {
    // Silently ignore; user can log out manually inside Steam.
  }
}

export async function startSteamWithLogin(accountName: string, paths?: SteamPaths): Promise<void> {
  const p = paths ?? (await getSteamInstallPath());
  if (!p) throw new Error('Steam installation not found');
  // Ensure Steam is not running; ignore errors if it's not.
  try {
    await executeCommand(`taskkill /IM steam.exe /F`);
  } catch {
    // ignore if Steam isn't running
  }
  // Best-effort username prefill. Steam may ignore this flag on some builds.
  // Shell-escape the accountName for Windows cmd by quoting and doubling internal quotes.
  const safeAccount = `"${accountName.replace(/"/g, '""')}"`;
  await executeCommand(`start "" "${p.steamExe}" -login ${safeAccount}`);
}

export async function getCurrentSteamUser(paths?: SteamPaths): Promise<SteamUser | undefined> {
  const p = paths ?? (await getSteamInstallPath());
  if (!p) return undefined;
  const loginUsersPath = join(p.configPath, 'loginusers.vdf');
  if (!existsSync(loginUsersPath)) return undefined;
  try {
    const raw = readFileSync(loginUsersPath, 'utf8');
    const v = parseVDF(raw);
    const root = (v['users'] || v) as Record<string, unknown>;
    let mostRecent: SteamUser | undefined;
    const users: SteamUser[] = [];
    for (const key of Object.keys(root)) {
      const u = root[key];
      if (!u || typeof u !== 'object') continue;
      const uobj = u as Record<string, unknown>;
      const accountName = getStr(uobj, 'AccountName');
      const personaName = getStr(uobj, 'PersonaName');
      const most = getStr(uobj, 'MostRecent') === '1';
      const remember = getStr(uobj, 'RememberPassword') === '1';
      const su: SteamUser = {
        steamId64: key,
        accountName,
        personaName,
        mostRecent: most,
        rememberPassword: remember,
      };
      users.push(su);
      if (most) mostRecent = su;
    }
    if (mostRecent) return mostRecent;
    // Fallback to AutoLoginUser registry value -> match AccountName
    const autoLogin = await readRegistryString('HKCU\\Software\\Valve\\Steam', 'AutoLoginUser');
    if (autoLogin) {
      const match = users.find((u) => u.accountName.toLowerCase() === autoLogin.toLowerCase());
      if (match) return match;
    }
    return users[0];
  } catch {
    return undefined;
  }
}

export function listInstalledGamesForUser(steamPath: string, steamId64: string): SteamGame[] {
  const games = listAllInstalledGames(steamPath);
  // Only keep games whose manifest LastOwner strictly matches the current user's SteamID64
  return games.filter((g) => g.lastOwner === steamId64);
}

export interface SteamLibrary {
  path: string; // root of the library folder
  steamapps: string; // <library>\steamapps
}

export interface SteamGame {
  appid: string;
  name: string;
  installdir: string; // folder under common
  libraryPath: string; // library root
  installed: boolean;
  lastOwner?: string; // SteamID64 of the account that last owned/installed
}

export interface SteamUser {
  steamId64: string;
  accountName: string;
  personaName?: string;
  mostRecent?: boolean;
  rememberPassword?: boolean;
}

function readRegistryString(path: string, value: string): Promise<string | undefined> {
  // Use reg.exe to query a value
  // Example: reg query "HKCU\\Software\\Valve\\Steam" /v SteamPath
  const cmd = `reg query "${path}" /v ${value}`;
  return executeCommand(cmd, { encoding: 'utf8' })
    .then((out) => {
      // Example line: "    SteamPath    REG_SZ    C:\\Program Files (x86)\\Steam"
      const lines = out.split(/\r?\n/);
      const rx = new RegExp(`^\\s*${value}\\s+REG_\\w+\\s+(.+)$`, 'i');
      for (const line of lines) {
        const m = line.match(rx);
        if (m && m[1]) return m[1].trim();
      }
      return undefined;
    })
    .catch(() => undefined);
}

export async function getSteamInstallPath(): Promise<SteamPaths | undefined> {
  const hkcu = await readRegistryString('HKCU\\Software\\Valve\\Steam', 'SteamPath');
  let root = hkcu;
  if (!root) {
    const hklmWow = await readRegistryString(
      'HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam',
      'InstallPath',
    );
    const hklm = await readRegistryString('HKLM\\SOFTWARE\\Valve\\Steam', 'InstallPath');
    root = hklmWow || hklm || undefined;
  }
  if (!root) return undefined;
  const steamExe = join(root, 'steam.exe');
  const configPath = join(root, 'config');
  return { steamPath: root, steamExe, configPath };
}

export function getLibraryFolders(steamPath: string): SteamLibrary[] {
  const primary: SteamLibrary[] = [{ path: steamPath, steamapps: join(steamPath, 'steamapps') }];
  // libraryfolders.vdf lives in <SteamPath>\steamapps
  const vdfPath = join(steamPath, 'steamapps', 'libraryfolders.vdf');
  if (!existsSync(vdfPath)) return primary;

  try {
    const raw = readFileSync(vdfPath, 'utf8');
    const v = parseVDF(raw);
    const root = (v['libraryfolders'] || v) as Record<string, unknown>;
    // Newer Steam uses numeric keys with objects containing path/apps
    for (const key of Object.keys(root)) {
      if (key === 'time') continue;
      const entry = (root as Record<string, unknown>)[key];
      if (typeof entry === 'string') {
        // Old style: key -> path
        const p = entry as string;
        primary.push({ path: p, steamapps: join(p, 'steamapps') });
      } else if (typeof entry === 'object' && entry) {
        const pobj = entry as Record<string, unknown>;
        const p = pobj['path'];
        if (typeof p === 'string') {
          primary.push({ path: p, steamapps: join(p, 'steamapps') });
        }
      }
    }
  } catch {
    // ignore parse errors, return at least primary
  }
  // Deduplicate and only keep those with steamapps existing
  const seen = new Set<string>();
  const libs = primary.filter((l) => {
    const key = l.path.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    try {
      return existsSync(l.steamapps);
    } catch {
      return false;
    }
  });
  return libs;
}

export function getInstalledGamesFromLibrary(library: SteamLibrary): SteamGame[] {
  const games: SteamGame[] = [];
  let files: string[] = [];
  try {
    files = readdirSync(library.steamapps);
  } catch {
    return games;
  }
  for (const f of files) {
    if (!f.startsWith('appmanifest_') || !f.endsWith('.acf')) continue;
    const full = join(library.steamapps, f);
    try {
      const raw = readFileSync(full, 'utf8');
      const v = parseVDF(raw);
      const app = (v['AppState'] || v) as Record<string, unknown>;
      const appid = getStr(app, 'appid').trim();
      const name = getStr(app, 'name').trim();
      const installdir = getStr(app, 'installdir').trim();
      const stateFlags = getStr(app, 'StateFlags').trim();
      const lastOwner = getStr(app, 'LastOwner').trim();
      const installed = stateFlags !== '' ? stateFlags !== '0' : true;
      if (appid && name) {
        games.push({
          appid,
          name,
          installdir,
          libraryPath: library.path,
          installed,
          lastOwner,
        });
      }
    } catch {
      // ignore malformed manifests
    }
  }
  return games;
}

export function listAllInstalledGames(steamPath: string): SteamGame[] {
  const libs = getLibraryFolders(steamPath);
  const all: SteamGame[] = [];
  for (const lib of libs) {
    all.push(...getInstalledGamesFromLibrary(lib));
  }
  // Deduplicate by appid, keep first occurrence
  const seen = new Set<string>();
  return all.filter((g) => {
    if (seen.has(g.appid)) return false;
    seen.add(g.appid);
    return true;
  });
}

export async function launchSteamGame(appid: string): Promise<void> {
  // Try protocol first
  try {
    await executeCommand(`start "" "steam://rungameid/${appid}"`);
    return;
  } catch {
    // protocol may be blocked; fallback below
  }
  // Fallback to steam.exe -applaunch
  const paths = await getSteamInstallPath();
  if (!paths) throw new Error('Could not locate Steam installation');
  await executeCommand(`"${paths.steamExe}" -applaunch ${appid}`);
}
