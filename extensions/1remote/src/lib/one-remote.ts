import { environment, getPreferenceValues } from "@raycast/api";
import { execFileSync, spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export type ServerJson = Record<string, unknown> & {
  DisplayName?: string;
  Address?: string;
  Port?: string;
  UserName?: string;
  Domain?: string;
  Tags?: string[];
  Note?: string;
  ColorHex?: string;
  IconBase64?: string;
};

export interface Connection {
  id: string;
  protocol: string;
  classVersion: string;
  json: ServerJson;
  name: string;
  address: string;
  port: string;
  userName: string;
  tags: string[];
  note: string;
  lastConnected?: number;
}

export interface EditableFields {
  DisplayName: string;
  Address: string;
  Port: string;
  UserName: string;
  Domain?: string;
  Tags: string[];
  Note: string;
  ColorHex: string;
}

const SERVERS_TIMESTAMP_KEY = "UpdateTimestamp_Servers";

function readJsonFile<T>(file: string): T | undefined {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8").trimStart()) as T;
  } catch {
    return undefined;
  }
}

const EXE_NAME = "1Remote.exe";

const isExe = (file: string | undefined): file is string =>
  !!file && path.basename(file).toLowerCase() === EXE_NAME.toLowerCase() && fs.existsSync(file);

function runQuiet(file: string, args: string[]): string {
  try {
    return execFileSync(file, args, { encoding: "utf8", windowsHide: true, timeout: 5000, stdio: "pipe" });
  } catch {
    return "";
  }
}

// 1Remote registers itself here when "start with Windows" is enabled.
function findInAutostart(): string | undefined {
  const output = runQuiet("reg", ["query", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "/v", "1Remote"]);
  const match = output.match(/REG_\w+\s+"?([^"\r\n]+?\.exe)"?/i);
  return match?.[1];
}

function findInKnownFolders(): string | undefined {
  const env = process.env;
  const candidates = [
    env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, "Programs", "1Remote", EXE_NAME),
    env.ProgramFiles && path.join(env.ProgramFiles, "1Remote", EXE_NAME),
    env["ProgramFiles(x86)"] && path.join(env["ProgramFiles(x86)"], "1Remote", EXE_NAME),
    path.join(os.homedir(), "scoop", "apps", "1remote", "current", EXE_NAME),
    env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, "Microsoft", "WindowsApps", EXE_NAME),
  ];
  return candidates.find((candidate) => isExe(candidate || undefined)) || undefined;
}

// Slower fallback: running process, then desktop / start menu shortcuts.
function findViaPowerShell(): string | undefined {
  const script = `
$p = Get-Process -Name 1Remote -ErrorAction SilentlyContinue | Where-Object Path | Select-Object -First 1 -ExpandProperty Path
if ($p) { $p; exit }
$shell = New-Object -ComObject WScript.Shell
$dirs = @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('StartMenu'), [Environment]::GetFolderPath('CommonStartMenu'), [Environment]::GetFolderPath('Startup'))
Get-ChildItem -Path $dirs -Filter '*1Remote*.lnk' -Recurse -ErrorAction SilentlyContinue |
  ForEach-Object { $shell.CreateShortcut($_.FullName).TargetPath } |
  Where-Object { $_ -like '*1Remote.exe' } | Select-Object -First 1`;
  const output = runQuiet("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script]).trim();
  return output.split(/\r?\n/)[0]?.trim() || undefined;
}

function findOnPath(): string | undefined {
  return runQuiet("where.exe", [EXE_NAME]).split(/\r?\n/)[0]?.trim() || undefined;
}

let resolvedExePath: string | undefined;

export function getExePath(): string {
  const { exePath } = getPreferenceValues<Preferences>();
  if (exePath) {
    if (isExe(exePath)) return exePath;
    throw new Error(`1Remote.exe not found at "${exePath}". Fix or clear the path in the extension preferences.`);
  }
  if (isExe(resolvedExePath)) return resolvedExePath;

  const cacheFile = path.join(environment.supportPath, "exe-path.txt");
  const cached = fs.existsSync(cacheFile) ? fs.readFileSync(cacheFile, "utf8").trim() : undefined;
  if (isExe(cached)) return (resolvedExePath = cached);

  for (const finder of [findInAutostart, findInKnownFolders, findViaPowerShell, findOnPath]) {
    const found = finder();
    if (isExe(found)) {
      fs.mkdirSync(environment.supportPath, { recursive: true });
      fs.writeFileSync(cacheFile, found);
      return (resolvedExePath = found);
    }
  }
  throw new Error(
    "Could not find 1Remote.exe automatically. Start 1Remote once or set the path in the extension preferences.",
  );
}

// Mirrors 1Remote's AppInit: portable mode keeps everything next to the exe, otherwise %APPDATA% / %LOCALAPPDATA%.
function getAppPaths() {
  const exeDir = path.dirname(getExePath());
  const isPortable =
    !fs.existsSync(path.join(exeDir, "FORCE_INTO_APPDATA_MODE")) &&
    (fs.existsSync(path.join(exeDir, "FORCE_INTO_PORTABLE_MODE")) || fs.existsSync(path.join(exeDir, "1Remote.json")));
  if (isPortable) return { baseDir: exeDir, localityBaseDir: exeDir };
  const appData = process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
  const localAppData = process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");
  return { baseDir: path.join(appData, "1Remote"), localityBaseDir: path.join(localAppData, "1Remote") };
}

export function getDbPath(): string {
  const { dbPath } = getPreferenceValues<Preferences>();
  if (dbPath?.trim()) return dbPath.trim();
  const { baseDir } = getAppPaths();
  const profile = readJsonFile<{ SqliteDatabasePath?: string }>(path.join(baseDir, "1Remote.json"));
  const resolved = profile?.SqliteDatabasePath || path.join(baseDir, "1Remote.db");
  if (!fs.existsSync(resolved)) throw new Error(`1Remote database not found at "${resolved}".`);
  return resolved;
}

function readConnectRecords(): Record<string, number> {
  const { localityBaseDir } = getAppPaths();
  const file = path.join(localityBaseDir, ".locality", ".connection_records.json");
  return readJsonFile<{ ConnectRecodes?: Record<string, number> }>(file)?.ConnectRecodes ?? {};
}

function openDb(readOnly: boolean): DatabaseSync {
  const db = new DatabaseSync(getDbPath(), { readOnly });
  db.exec("PRAGMA busy_timeout = 5000");
  return db;
}

function withWriteTransaction(work: (db: DatabaseSync) => void) {
  const db = openDb(false);
  try {
    db.exec("BEGIN IMMEDIATE");
    try {
      work(db);
      // 1Remote polls this value and reloads its server list when it changes.
      db.prepare("INSERT OR REPLACE INTO Configs (Key, Value) VALUES (?, ?)").run(
        SERVERS_TIMESTAMP_KEY,
        Date.now().toString(),
      );
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  } finally {
    db.close();
  }
}

function toConnection(
  row: { Id: string; Protocol: string; ClassVersion: string; Json: string },
  records: Record<string, number>,
): Connection {
  const json = JSON.parse(row.Json) as ServerJson;
  return {
    id: row.Id,
    protocol: row.Protocol,
    classVersion: row.ClassVersion,
    json,
    name: json.DisplayName || row.Id,
    address: json.Address ?? "",
    port: json.Port ?? "",
    userName: json.UserName ?? "",
    tags: Array.isArray(json.Tags) ? json.Tags : [],
    note: json.Note ?? "",
    lastConnected: records[row.Id],
  };
}

export function loadConnections(): Connection[] {
  const records = readConnectRecords();
  const db = openDb(true);
  try {
    const rows = db.prepare("SELECT Id, Protocol, ClassVersion, Json FROM Servers").all() as {
      Id: string;
      Protocol: string;
      ClassVersion: string;
      Json: string;
    }[];
    return rows
      .map((row) => toConnection(row, records))
      .sort((a, b) => (b.lastConnected ?? 0) - (a.lastConnected ?? 0) || a.name.localeCompare(b.name));
  } finally {
    db.close();
  }
}

export function updateConnection(id: string, fields: EditableFields) {
  withWriteTransaction((db) => {
    const row = db.prepare("SELECT Json FROM Servers WHERE Id = ?").get(id) as { Json: string } | undefined;
    if (!row) throw new Error("Connection no longer exists in the 1Remote database.");
    const json = JSON.parse(row.Json) as ServerJson;
    const { Domain, ...rest } = fields;
    Object.assign(json, rest);
    if (Domain !== undefined && "Domain" in json) json.Domain = Domain;
    db.prepare("UPDATE Servers SET Json = ? WHERE Id = ?").run(JSON.stringify(json), id);
  });
}

export function duplicateConnection(source: Connection, newName: string): string {
  const id = newUlid();
  const json: ServerJson = { ...source.json, DisplayName: newName };
  withWriteTransaction((db) => {
    db.prepare("INSERT INTO Servers (Id, Protocol, ClassVersion, Json) VALUES (?, ?, ?, ?)").run(
      id,
      source.protocol,
      source.classVersion,
      JSON.stringify(json),
    );
  });
  return id;
}

export function deleteConnection(id: string) {
  withWriteTransaction((db) => {
    db.prepare("DELETE FROM Servers WHERE Id = ?").run(id);
  });
}

function launch(args: string[]) {
  const exe = getExePath();
  // Portable 1Remote resolves its data folder from the working directory.
  const child = spawn(exe, args, { cwd: path.dirname(exe), detached: true, stdio: "ignore", windowsHide: false });
  child.unref();
}

export const connect = (connection: Connection) => launch([`ULID:${connection.id}`]);
export const connectTag = (tag: string) => launch([`#${tag}`]);
export const activate1Remote = () => launch([]);

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function newUlid(): string {
  let time = Date.now();
  let timePart = "";
  for (let i = 0; i < 10; i++) {
    timePart = CROCKFORD[time % 32] + timePart;
    time = Math.floor(time / 32);
  }
  const random = randomBytes(16);
  let randomPart = "";
  for (let i = 0; i < 16; i++) randomPart += CROCKFORD[random[i] % 32];
  return timePart + randomPart;
}

export function getIconPath(connection: Connection, cacheDir: string): string | undefined {
  const base64 = connection.json.IconBase64;
  if (!base64) return undefined;
  const hash = createHash("md5").update(base64).digest("hex");
  const file = path.join(cacheDir, "icons", `${hash}.png`);
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(base64, "base64"));
  }
  return file;
}
