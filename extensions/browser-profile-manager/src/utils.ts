import { spawn } from "node:child_process";
import { constants as fsConstants, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import ini from "ini";
import { BrowserProfile, BrowserType, ScanResult, ScanWarning } from "./types";

type ChromiumBrowser = Exclude<BrowserType, "Firefox">;
type EnvName =
  | "LOCALAPPDATA"
  | "APPDATA"
  | "PROGRAMFILES"
  | "PROGRAMFILES(X86)";

const HOME_DIR = os.homedir();
const SYSTEM_DRIVE = getEnvValue("SYSTEMDRIVE") ?? "C:";
const FALLBACK_LOCAL_APP_DATA = HOME_DIR
  ? path.join(HOME_DIR, "AppData", "Local")
  : undefined;
const FALLBACK_APP_DATA = HOME_DIR
  ? path.join(HOME_DIR, "AppData", "Roaming")
  : undefined;
const FALLBACK_PROGRAM_FILES = path.join(SYSTEM_DRIVE, "Program Files");
const FALLBACK_PROGRAM_FILES_X86 = path.join(
  SYSTEM_DRIVE,
  "Program Files (x86)",
);

interface ChromiumProfileCacheEntry {
  Name?: string;
  name?: string;
  shortcut_name?: string;
  ShortcutName?: string;
}

interface FirefoxIniProfile {
  profilePath: string;
  profileName: string;
  isRelative: boolean;
}

type NodeSqlitePreparedStatement = {
  all?: () => unknown[];
  iterate?: () => Iterable<unknown>;
};

type NodeSqliteModule = {
  DatabaseSync: new (
    filename: string,
    options?: Record<string, unknown>,
  ) => {
    prepare: (sql: string) => NodeSqlitePreparedStatement;
    close: () => void;
  };
};

type LaunchErrorCode = "BROWSER_NOT_FOUND" | "LAUNCH_FAILED";

const CHROMIUM_BROWSERS: ChromiumBrowser[] = ["Chrome", "Edge", "Comet"];

const CHROMIUM_DATA_DIR_CANDIDATES: Record<ChromiumBrowser, string[]> = {
  Chrome: compact([joinEnv("LOCALAPPDATA", "Google", "Chrome", "User Data")]),
  Edge: compact([joinEnv("LOCALAPPDATA", "Microsoft", "Edge", "User Data")]),
  Comet: compact([
    joinEnv("LOCALAPPDATA", "Perplexity", "Comet", "User Data"),
    joinEnv("LOCALAPPDATA", "Comet", "User Data"),
  ]),
};

const FIREFOX_BASE_DIR = joinEnv("APPDATA", "Mozilla", "Firefox");

const BROWSER_EXECUTABLE_CANDIDATES: Record<BrowserType, string[]> = {
  Chrome: compact([
    joinEnv("LOCALAPPDATA", "Google", "Chrome", "Application", "chrome.exe"),
    joinEnv("PROGRAMFILES", "Google", "Chrome", "Application", "chrome.exe"),
    joinEnv(
      "PROGRAMFILES(X86)",
      "Google",
      "Chrome",
      "Application",
      "chrome.exe",
    ),
    "chrome.exe",
  ]),
  Edge: compact([
    joinEnv("LOCALAPPDATA", "Microsoft", "Edge", "Application", "msedge.exe"),
    joinEnv("PROGRAMFILES", "Microsoft", "Edge", "Application", "msedge.exe"),
    joinEnv(
      "PROGRAMFILES(X86)",
      "Microsoft",
      "Edge",
      "Application",
      "msedge.exe",
    ),
    "msedge.exe",
  ]),
  Firefox: compact([
    joinEnv("PROGRAMFILES", "Mozilla Firefox", "firefox.exe"),
    joinEnv("PROGRAMFILES(X86)", "Mozilla Firefox", "firefox.exe"),
    joinEnv("LOCALAPPDATA", "Mozilla Firefox", "firefox.exe"),
    "firefox.exe",
  ]),
  Comet: compact([
    joinEnv("LOCALAPPDATA", "Perplexity", "Comet", "Application", "comet.exe"),
    joinEnv("PROGRAMFILES", "Perplexity", "Comet", "Application", "comet.exe"),
    joinEnv(
      "PROGRAMFILES(X86)",
      "Perplexity",
      "Comet",
      "Application",
      "comet.exe",
    ),
    joinEnv("LOCALAPPDATA", "Comet", "Application", "comet.exe"),
    joinEnv("PROGRAMFILES", "Comet", "Application", "comet.exe"),
    joinEnv("PROGRAMFILES(X86)", "Comet", "Application", "comet.exe"),
    "comet.exe",
  ]),
};

const BROWSER_SORT_INDEX: Record<BrowserType, number> = {
  Chrome: 0,
  Edge: 1,
  Firefox: 2,
  Comet: 3,
};

const MAX_CHROMIUM_LOCAL_STATE_BYTES = 8 * 1024 * 1024;
const MAX_FIREFOX_PROFILE_GROUP_ROWS = 5_000;

let sqliteModulePromise: Promise<NodeSqliteModule | undefined> | undefined;

export class BrowserLaunchError extends Error {
  readonly code: LaunchErrorCode;

  constructor(code: LaunchErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "BrowserLaunchError";
    this.code = code;
  }
}

export async function detectBrowserProfiles(): Promise<ScanResult> {
  const chromiumResults = await Promise.all(
    CHROMIUM_BROWSERS.map((browser) => readChromiumProfiles(browser)),
  );
  const firefoxResult = await readFirefoxProfiles();

  const profiles = chromiumResults
    .flatMap((result) => result.profiles)
    .concat(firefoxResult.profiles);
  const warnings = chromiumResults
    .flatMap((result) => result.warnings)
    .concat(firefoxResult.warnings);

  profiles.sort((left, right) => {
    const browserOrderDiff =
      BROWSER_SORT_INDEX[left.browser] - BROWSER_SORT_INDEX[right.browser];
    if (browserOrderDiff !== 0) {
      return browserOrderDiff;
    }

    return left.originalName.localeCompare(right.originalName, undefined, {
      sensitivity: "base",
    });
  });

  return { profiles, warnings };
}

export async function launchBrowserProfile(
  profile: BrowserProfile,
): Promise<void> {
  const executable = await resolveExecutable(profile.browser);
  if (!executable) {
    throw new BrowserLaunchError(
      "BROWSER_NOT_FOUND",
      `${profile.browser} executable was not found`,
    );
  }

  const args =
    profile.browser === "Firefox"
      ? getFirefoxLaunchArgs(profile)
      : [`--profile-directory=${profile.folderPath}`];

  try {
    await runProcess(executable, args);
  } catch (error) {
    throw new BrowserLaunchError(
      "LAUNCH_FAILED",
      `Could not open ${profile.browser} profile`,
      { cause: error as Error },
    );
  }
}

async function readChromiumProfiles(
  browser: ChromiumBrowser,
): Promise<ScanResult> {
  const candidateDirs = CHROMIUM_DATA_DIR_CANDIDATES[browser];
  const warnings: ScanWarning[] = [];

  if (candidateDirs.length === 0) {
    return {
      profiles: [],
      warnings: [
        createWarning(
          browser,
          "LOCALAPPDATA environment variable is not available",
        ),
      ],
    };
  }

  let dataDir: string | undefined;
  for (const candidateDir of candidateDirs) {
    const canReadCandidateDir = await canReadPath(candidateDir);
    if (canReadCandidateDir.ok) {
      dataDir = candidateDir;
      break;
    }

    if (!canReadCandidateDir.notFound) {
      warnings.push(
        createWarning(
          browser,
          canReadCandidateDir.message,
          candidateDir,
          canReadCandidateDir.code,
        ),
      );
    }
  }

  if (!dataDir) {
    return { profiles: [], warnings };
  }

  const localStatePath = path.join(dataDir, "Local State");
  const [namesByFolder, detectedFolders] = await Promise.all([
    readChromiumNamesByFolder(browser, localStatePath, warnings),
    readChromiumProfileFolders(browser, dataDir, warnings),
  ]);

  const folderNames = new Set<string>([
    ...detectedFolders,
    ...namesByFolder.keys(),
  ]);
  const profiles: BrowserProfile[] = [];

  for (const folderName of folderNames) {
    const originalName = firstNonEmpty(
      namesByFolder.get(folderName),
      folderName,
    );
    if (!folderName || !originalName) {
      continue;
    }

    profiles.push({
      id: `${browser.toLowerCase()}_${folderName}`,
      browser,
      originalName,
      folderPath: folderName,
    });
  }

  return { profiles, warnings };
}

async function readChromiumNamesByFolder(
  browser: ChromiumBrowser,
  localStatePath: string,
  warnings: ScanWarning[],
): Promise<Map<string, string>> {
  const namesByFolder = new Map<string, string>();

  const localStateSize = await readFileSize(localStatePath, browser, warnings);
  if (
    typeof localStateSize === "number" &&
    localStateSize > MAX_CHROMIUM_LOCAL_STATE_BYTES
  ) {
    warnings.push(
      createWarning(
        browser,
        "Local State file is too large; falling back to folder names to avoid high memory usage",
        localStatePath,
        "LOCAL_STATE_TOO_LARGE",
      ),
    );
    return namesByFolder;
  }

  const localStateRaw = await readFileUtf8(localStatePath, browser, warnings);
  if (!localStateRaw) {
    return namesByFolder;
  }

  const infoCache = parseChromiumInfoCache(localStateRaw);
  if (!infoCache) {
    warnings.push(
      createWarning(
        browser,
        "Could not extract info_cache from Local State",
        localStatePath,
      ),
    );
    return namesByFolder;
  }

  for (const [folderName, cacheEntry] of Object.entries(infoCache)) {
    const originalName = firstNonEmpty(
      cacheEntry.Name,
      cacheEntry.name,
      cacheEntry.shortcut_name,
      cacheEntry.ShortcutName,
      folderName,
    );

    if (!folderName || !originalName) {
      continue;
    }

    namesByFolder.set(folderName, originalName);
  }

  return namesByFolder;
}

async function readChromiumProfileFolders(
  browser: ChromiumBrowser,
  dataDir: string,
  warnings: ScanWarning[],
): Promise<string[]> {
  try {
    const entries = await fs.readdir(dataDir, { withFileTypes: true });
    return entries
      .filter(
        (entry) =>
          entry.isDirectory() && isLikelyChromiumProfileDir(entry.name),
      )
      .map((entry) => entry.name);
  } catch (error) {
    const typedError = asErrno(error);
    warnings.push(
      createWarning(
        browser,
        isPermissionError(error)
          ? "Permission denied while listing browser profile directory"
          : "Could not list browser profile directory",
        dataDir,
        typedError?.code,
      ),
    );
    return [];
  }
}

function isLikelyChromiumProfileDir(folderName: string): boolean {
  const normalizedName = folderName.trim();
  if (!normalizedName) {
    return false;
  }

  return (
    normalizedName === "Default" ||
    normalizedName === "Guest Profile" ||
    normalizedName === "System Profile" ||
    /^Profile \d+$/i.test(normalizedName) ||
    /^Person \d+$/i.test(normalizedName)
  );
}

function parseChromiumInfoCache(
  localStateRaw: string,
): Record<string, ChromiumProfileCacheEntry> | undefined {
  const infoCacheRaw = extractJsonObjectByKey(localStateRaw, "info_cache");
  if (!infoCacheRaw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(infoCacheRaw) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, ChromiumProfileCacheEntry>;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function extractJsonObjectByKey(
  source: string,
  keyName: string,
): string | undefined {
  const keyToken = `"${keyName}"`;
  const keyIndex = source.indexOf(keyToken);
  if (keyIndex === -1) {
    return undefined;
  }

  let cursor = keyIndex + keyToken.length;
  while (cursor < source.length && isJsonWhitespace(source[cursor])) {
    cursor += 1;
  }

  if (source[cursor] !== ":") {
    return undefined;
  }
  cursor += 1;

  while (cursor < source.length && isJsonWhitespace(source[cursor])) {
    cursor += 1;
  }

  if (source[cursor] !== "{") {
    return undefined;
  }

  const objectEnd = findJsonObjectEnd(source, cursor);
  if (objectEnd === -1) {
    return undefined;
  }

  return source.slice(cursor, objectEnd + 1);
}

function findJsonObjectEnd(source: string, objectStart: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = objectStart; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function isJsonWhitespace(value: string | undefined): boolean {
  return value === " " || value === "\n" || value === "\r" || value === "\t";
}

async function readFirefoxProfiles(): Promise<ScanResult> {
  const browser: BrowserType = "Firefox";
  const warnings: ScanWarning[] = [];

  if (!FIREFOX_BASE_DIR) {
    return {
      profiles: [],
      warnings: [
        createWarning(browser, "APPDATA environment variable is not available"),
      ],
    };
  }

  const canReadBaseDir = await canReadPath(FIREFOX_BASE_DIR);
  if (!canReadBaseDir.ok) {
    if (!canReadBaseDir.notFound) {
      warnings.push(
        createWarning(
          browser,
          canReadBaseDir.message,
          FIREFOX_BASE_DIR,
          canReadBaseDir.code,
        ),
      );
    }
    return { profiles: [], warnings };
  }

  const [iniProfiles, groupDisplayNames, profileFolders] = await Promise.all([
    readFirefoxIniProfiles(browser, warnings),
    readFirefoxGroupDisplayNames(browser, FIREFOX_BASE_DIR, warnings),
    readFirefoxProfileFolders(browser, FIREFOX_BASE_DIR, warnings),
  ]);

  const profilesById = new Map<string, BrowserProfile>();

  for (const iniProfile of iniProfiles) {
    const normalizedPath = normalizeFirefoxProfilePath(iniProfile.profilePath);
    if (!normalizedPath) {
      continue;
    }

    const displayName = firstNonEmpty(
      groupDisplayNames.get(firefoxPathKey(normalizedPath)),
      iniProfile.profileName,
      fallbackFirefoxProfileName(normalizedPath),
    );
    const id = `firefox_${normalizedPath}`;
    profilesById.set(id, {
      id,
      browser,
      originalName: displayName,
      folderPath: normalizedPath,
      isRelative: iniProfile.isRelative,
    });
  }

  for (const profileFolderPath of profileFolders) {
    const normalizedPath = normalizeFirefoxProfilePath(profileFolderPath);
    if (!normalizedPath) {
      continue;
    }

    const id = `firefox_${normalizedPath}`;
    if (profilesById.has(id)) {
      continue;
    }

    const displayName = firstNonEmpty(
      groupDisplayNames.get(firefoxPathKey(normalizedPath)),
      fallbackFirefoxProfileName(normalizedPath),
    );
    profilesById.set(id, {
      id,
      browser,
      originalName: displayName,
      folderPath: normalizedPath,
      isRelative: true,
    });
  }

  return { profiles: [...profilesById.values()], warnings };
}

async function resolveExecutable(
  browser: BrowserType,
): Promise<string | undefined> {
  const candidates = BROWSER_EXECUTABLE_CANDIDATES[browser];

  for (const candidate of candidates) {
    if (!path.isAbsolute(candidate)) {
      return candidate;
    }

    if (await exists(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function runProcess(executable: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const processHandle = spawn(executable, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });

    processHandle.once("error", (error) => {
      reject(error);
    });
    processHandle.once("spawn", () => {
      processHandle.unref();
      resolve();
    });
  });
}

async function readFirefoxIniProfiles(
  browser: BrowserType,
  warnings: ScanWarning[],
): Promise<FirefoxIniProfile[]> {
  if (!FIREFOX_BASE_DIR) {
    return [];
  }

  const profilesIniPath = path.join(FIREFOX_BASE_DIR, "profiles.ini");
  const iniRaw = await readFileUtf8(profilesIniPath, browser, warnings);
  if (!iniRaw) {
    return [];
  }

  let parsedIni: Record<string, Record<string, string>>;
  try {
    parsedIni = ini.parse(iniRaw) as Record<string, Record<string, string>>;
  } catch {
    warnings.push(
      createWarning(browser, "Could not parse profiles.ini", profilesIniPath),
    );
    return [];
  }

  const profiles: FirefoxIniProfile[] = [];
  for (const section of Object.values(parsedIni)) {
    const profilePath = normalizeFirefoxProfilePath(
      (section?.Path ?? "").trim(),
    );
    const profileName = (section?.Name ?? "").trim();
    if (!profilePath || !profileName) {
      continue;
    }

    profiles.push({
      profilePath,
      profileName,
      isRelative: `${section.IsRelative ?? ""}`.trim() !== "0",
    });
  }

  return profiles;
}

async function readFirefoxGroupDisplayNames(
  browser: BrowserType,
  firefoxBaseDir: string,
  warnings: ScanWarning[],
): Promise<Map<string, string>> {
  const profileGroupsDir = path.join(firefoxBaseDir, "Profile Groups");
  const namesByPath = new Map<string, string>();

  const canReadGroupsDir = await canReadPath(profileGroupsDir);
  if (!canReadGroupsDir.ok) {
    if (!canReadGroupsDir.notFound) {
      warnings.push(
        createWarning(
          browser,
          canReadGroupsDir.message,
          profileGroupsDir,
          canReadGroupsDir.code,
        ),
      );
    }

    return namesByPath;
  }

  let sqliteModule: NodeSqliteModule | undefined;
  try {
    sqliteModule = await getNodeSqliteModule();
  } catch {
    sqliteModule = undefined;
  }

  if (!sqliteModule) {
    return namesByPath;
  }

  let entries: Array<{ name: string; isFile: () => boolean }>;
  try {
    entries = await fs.readdir(profileGroupsDir, { withFileTypes: true });
  } catch (error) {
    const typedError = asErrno(error);
    warnings.push(
      createWarning(
        browser,
        isPermissionError(error)
          ? "Permission denied while listing Profile Groups"
          : "Could not list Profile Groups",
        profileGroupsDir,
        typedError?.code,
      ),
    );
    return namesByPath;
  }

  const sqliteFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sqlite"))
    .map((entry) => path.join(profileGroupsDir, entry.name));

  for (const sqliteFilePath of sqliteFiles) {
    let database:
      | {
          prepare: (sql: string) => NodeSqlitePreparedStatement;
          close: () => void;
        }
      | undefined;

    try {
      database = new sqliteModule.DatabaseSync(sqliteFilePath, {
        readOnly: true,
      });
      const statement = database.prepare("SELECT path, name FROM Profiles");
      const rows =
        typeof statement.iterate === "function"
          ? statement.iterate()
          : (statement.all?.() ?? []);

      let rowsRead = 0;
      for (const row of rows) {
        rowsRead += 1;
        if (rowsRead > MAX_FIREFOX_PROFILE_GROUP_ROWS) {
          warnings.push(
            createWarning(
              browser,
              "Profile Groups read was limited to avoid high memory usage",
              sqliteFilePath,
            ),
          );
          break;
        }

        const typedRow = row as { path?: unknown; name?: unknown };
        const profilePath = normalizeFirefoxProfilePath(
          String(typedRow.path ?? ""),
        );
        const displayName = String(typedRow.name ?? "").trim();
        if (!profilePath || !displayName) {
          continue;
        }

        namesByPath.set(firefoxPathKey(profilePath), displayName);
      }
    } catch (error) {
      const typedError = asErrno(error);
      warnings.push(
        createWarning(
          browser,
          "Could not read profile names from Profile Groups database",
          sqliteFilePath,
          typedError?.code,
        ),
      );
    } finally {
      try {
        database?.close();
      } catch {
        // no-op
      }
    }
  }

  return namesByPath;
}

async function readFirefoxProfileFolders(
  browser: BrowserType,
  firefoxBaseDir: string,
  warnings: ScanWarning[],
): Promise<string[]> {
  const profilesDir = path.join(firefoxBaseDir, "Profiles");
  const canReadProfilesDir = await canReadPath(profilesDir);

  if (!canReadProfilesDir.ok) {
    if (!canReadProfilesDir.notFound) {
      warnings.push(
        createWarning(
          browser,
          canReadProfilesDir.message,
          profilesDir,
          canReadProfilesDir.code,
        ),
      );
    }

    return [];
  }

  try {
    const entries = await fs.readdir(profilesDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => normalizeFirefoxProfilePath(`Profiles/${entry.name}`))
      .filter(Boolean);
  } catch (error) {
    const typedError = asErrno(error);
    warnings.push(
      createWarning(
        browser,
        isPermissionError(error)
          ? "Permission denied while listing Firefox Profiles"
          : "Could not list Firefox Profiles",
        profilesDir,
        typedError?.code,
      ),
    );
    return [];
  }
}

function getFirefoxLaunchArgs(profile: BrowserProfile): string[] {
  const launchPath = resolveFirefoxProfileLaunchPath(profile);
  if (!launchPath) {
    return ["-P", profile.originalName];
  }

  return ["-profile", launchPath];
}

async function readFileSize(
  filePath: string,
  browser: BrowserType,
  warnings: ScanWarning[],
): Promise<number | undefined> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile() ? stats.size : undefined;
  } catch (error) {
    const typedError = asErrno(error);
    if (typedError?.code === "ENOENT") {
      return undefined;
    }

    if (isPermissionError(error)) {
      warnings.push(
        createWarning(
          browser,
          "Permission denied while accessing file",
          filePath,
          typedError?.code,
        ),
      );
      return undefined;
    }

    warnings.push(
      createWarning(
        browser,
        "Could not get file size",
        filePath,
        typedError?.code,
      ),
    );
    return undefined;
  }
}

async function readFileUtf8(
  filePath: string,
  browser: BrowserType,
  warnings: ScanWarning[],
): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    const typedError = asErrno(error);
    if (typedError?.code === "ENOENT") {
      return undefined;
    }

    if (isPermissionError(error)) {
      warnings.push(
        createWarning(
          browser,
          "Permission denied while reading file",
          filePath,
          typedError?.code,
        ),
      );
      return undefined;
    }

    warnings.push(
      createWarning(
        browser,
        "Unexpected error while reading file",
        filePath,
        typedError?.code,
      ),
    );
    return undefined;
  }
}

async function canReadPath(
  targetPath: string,
): Promise<
  { ok: true } | { ok: false; notFound?: true; message: string; code?: string }
> {
  try {
    await fs.access(targetPath, fsConstants.R_OK);
    return { ok: true };
  } catch (error) {
    const typedError = asErrno(error);
    if (typedError?.code === "ENOENT") {
      return { ok: false, notFound: true, message: "Path not found" };
    }

    if (isPermissionError(error)) {
      return {
        ok: false,
        message: "Permission denied while accessing path",
        code: typedError?.code,
      };
    }

    return {
      ok: false,
      message: "Could not access path",
      code: typedError?.code,
    };
  }
}

async function exists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function joinEnv(envName: EnvName, ...segments: string[]): string | undefined {
  const base = resolveEnvPath(envName);
  if (!base) {
    return undefined;
  }

  return path.join(base, ...segments);
}

async function getNodeSqliteModule(): Promise<NodeSqliteModule | undefined> {
  if (!sqliteModulePromise) {
    sqliteModulePromise = import("node:sqlite")
      .then((module) => module as unknown as NodeSqliteModule)
      .catch(() => undefined);
  }

  return sqliteModulePromise;
}

function resolveEnvPath(envName: EnvName): string | undefined {
  const fromEnv = getEnvValue(envName);
  if (fromEnv) {
    return fromEnv;
  }

  switch (envName) {
    case "LOCALAPPDATA":
      return FALLBACK_LOCAL_APP_DATA;
    case "APPDATA":
      return FALLBACK_APP_DATA;
    case "PROGRAMFILES":
      return getEnvValue("ProgramW6432") ?? FALLBACK_PROGRAM_FILES;
    case "PROGRAMFILES(X86)":
      return FALLBACK_PROGRAM_FILES_X86;
    default:
      return undefined;
  }
}

function getEnvValue(name: string): string | undefined {
  for (const [key, value] of Object.entries(process.env)) {
    if (key.toUpperCase() === name.toUpperCase()) {
      const trimmed = value?.trim();
      return trimmed || undefined;
    }
  }

  return undefined;
}

function compact(values: Array<string | undefined>): string[] {
  return values.filter((value): value is string => Boolean(value));
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return "";
}

function normalizeFirefoxProfilePath(profilePath: string): string {
  return profilePath.replaceAll("\\", "/").trim();
}

function firefoxPathKey(profilePath: string): string {
  return normalizeFirefoxProfilePath(profilePath).toLowerCase();
}

function fallbackFirefoxProfileName(profilePath: string): string {
  const normalizedPath = normalizeFirefoxProfilePath(profilePath);
  if (!normalizedPath) {
    return "";
  }

  const segments = normalizedPath.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? normalizedPath;
}

function resolveFirefoxProfileLaunchPath(
  profile: BrowserProfile,
): string | undefined {
  const profilePath = profile.folderPath.trim();
  if (!profilePath) {
    return undefined;
  }

  if (profile.isRelative === false) {
    return path.normalize(profilePath);
  }

  if (!FIREFOX_BASE_DIR) {
    return path.normalize(profilePath);
  }

  const normalizedRelativePath = normalizeFirefoxProfilePath(profilePath);
  if (!normalizedRelativePath) {
    return undefined;
  }

  return path.join(FIREFOX_BASE_DIR, ...normalizedRelativePath.split("/"));
}

function createWarning(
  browser: BrowserType,
  message: string,
  targetPath?: string,
  code?: string,
): ScanWarning {
  return { browser, message, path: targetPath, code };
}

function isPermissionError(error: unknown): boolean {
  const typedError = asErrno(error);
  return typedError?.code === "EACCES" || typedError?.code === "EPERM";
}

function asErrno(error: unknown): NodeJS.ErrnoException | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    return error as NodeJS.ErrnoException;
  }

  return undefined;
}
