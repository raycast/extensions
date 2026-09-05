import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const profilesIniPath = path.join(homedir(), "Library", "Application Support", "Firefox", "profiles.ini");

export type FirefoxProfile = {
  id: string;
  name: string;
  profilePath: string;
  isDefault: boolean;
};

export type FirefoxTab = {
  id: string;
  title: string;
  url: string;
  profile: FirefoxProfile;
  pinned: boolean;
};

type IniSection = Record<string, string>;
type ModernProfileRow = { id: number; name: string; path: string };
type SessionEntry = { url?: string; title?: string };
type SessionTab = { entries?: SessionEntry[]; index?: number; pinned?: boolean };
type SessionWindow = { tabs?: SessionTab[] };
type Session = { windows?: SessionWindow[] };

function parseIni(contents: string): Map<string, IniSection> {
  const sections = new Map<string, IniSection>();
  let current: IniSection | undefined;

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(";") || line.startsWith("#")) continue;
    const sectionMatch = line.match(/^\[(.+)]$/);
    if (sectionMatch) {
      current = {};
      sections.set(sectionMatch[1], current);
      continue;
    }
    const separator = line.indexOf("=");
    if (current && separator > 0) current[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return sections;
}

export async function loadProfiles(): Promise<FirefoxProfile[]> {
  const contents = await readFile(profilesIniPath, "utf8");
  const firefoxRoot = path.dirname(profilesIniPath);
  const sections = parseIni(contents);
  const defaultPaths = new Set(
    [...sections.entries()]
      .filter(([section, values]) => section.startsWith("Install") || values.Default === "1")
      .map(([, values]) => values.Path ?? values.Default)
      .filter(Boolean)
      .map((profilePath) => path.resolve(firefoxRoot, profilePath)),
  );
  const storeIds = new Set(
    [...sections.values()].map((values) => values.StoreID).filter((storeId): storeId is string => Boolean(storeId)),
  );
  const legacyProfiles = (): FirefoxProfile[] =>
    [...sections.entries()]
      .filter(([section, values]) => section.startsWith("Profile") && values.Name && values.Path)
      .map(([section, values]) => ({
        id: section,
        name: values.Name,
        profilePath: values.IsRelative === "0" ? values.Path : path.resolve(firefoxRoot, values.Path),
        isDefault: values.Default === "1",
      }));
  const modernProfiles: FirefoxProfile[] = [];

  for (const storeId of storeIds) {
    const databasePath = path.join(firefoxRoot, "Profile Groups", `${storeId}.sqlite`);
    try {
      const { stdout } = await execFileAsync(
        "/usr/bin/sqlite3",
        ["-json", databasePath, "SELECT id, name, path FROM Profiles ORDER BY id"],
        { encoding: "utf8" },
      );
      for (const row of JSON.parse(stdout || "[]") as ModernProfileRow[]) {
        const profilePath = path.resolve(firefoxRoot, row.path);
        modernProfiles.push({
          id: `${storeId}:${row.id}`,
          name: row.name,
          profilePath,
          isDefault: defaultPaths.has(profilePath),
        });
      }
    } catch {
      // A missing, corrupt, or outdated Profile Groups database should not block legacy profiles.ini parsing.
    }
  }

  const profiles = modernProfiles.length > 0 ? modernProfiles : legacyProfiles();
  return profiles.sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name));
}

function decompressMozLz4(buffer: Buffer): string {
  if (buffer.subarray(0, 8).toString("binary") !== "mozLz40\0") throw new Error("Invalid Firefox session file");
  const output = Buffer.allocUnsafe(buffer.readUInt32LE(8));
  let inputOffset = 12;
  let outputOffset = 0;

  while (inputOffset < buffer.length) {
    const token = buffer[inputOffset++];
    let literalLength = token >> 4;
    if (literalLength === 15) {
      let value = 255;
      while (value === 255) {
        value = buffer[inputOffset++];
        literalLength += value;
      }
    }
    buffer.copy(output, outputOffset, inputOffset, inputOffset + literalLength);
    inputOffset += literalLength;
    outputOffset += literalLength;
    if (inputOffset >= buffer.length) break;

    const matchOffset = buffer.readUInt16LE(inputOffset);
    inputOffset += 2;
    let matchLength = token & 0x0f;
    if (matchLength === 15) {
      let value = 255;
      while (value === 255) {
        value = buffer[inputOffset++];
        matchLength += value;
      }
    }
    matchLength += 4;
    for (let index = 0; index < matchLength; index++) {
      output[outputOffset] = output[outputOffset - matchOffset];
      outputOffset++;
    }
  }
  return output.subarray(0, outputOffset).toString("utf8");
}

async function readSession(profile: FirefoxProfile): Promise<Session | undefined> {
  const backupRoot = path.join(profile.profilePath, "sessionstore-backups");
  const candidates = ["recovery.jsonlz4", "recovery.baklz4", "previous.jsonlz4"];
  for (const candidate of candidates) {
    try {
      return JSON.parse(decompressMozLz4(await readFile(path.join(backupRoot, candidate)))) as Session;
    } catch {
      // Running profiles rewrite recovery files frequently; try the next stable backup if a read races a write.
    }
  }
  return undefined;
}

export async function loadFirefoxTabs(): Promise<FirefoxTab[]> {
  const profiles = await loadProfiles();
  const tabsByProfile = await Promise.all(
    profiles.map(async (profile) => {
      const session = await readSession(profile);
      const tabs: FirefoxTab[] = [];
      session?.windows?.forEach((window, windowIndex) =>
        window.tabs?.forEach((tab, tabIndex) => {
          const entry = tab.entries?.[Math.max(0, (tab.index ?? tab.entries.length) - 1)];
          if (!entry?.url || entry.url === "about:blank" || entry.url === "about:newtab") return;
          tabs.push({
            id: `${profile.id}:${windowIndex}:${tabIndex}:${entry.url}`,
            title: entry.title || entry.url,
            url: entry.url,
            profile,
            pinned: Boolean(tab.pinned),
          });
        }),
      );
      return tabs;
    }),
  );
  return tabsByProfile.flat();
}
