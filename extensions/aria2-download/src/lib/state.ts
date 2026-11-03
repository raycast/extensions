import { promises as fs } from "node:fs";
import path from "node:path";

import { Aria2Settings, InstallInfo } from "./types";
import { normalizeSettings } from "./settings";

const LOCAL_APP_DATA =
  process.env.LOCALAPPDATA ?? "C:\\Users\\Jie\\AppData\\Local";
export const STATE_ROOT = path.join(LOCAL_APP_DATA, "lat3ncy-toolbox", "aria2");

export const SETTINGS_PATH = path.join(STATE_ROOT, "settings.json");
export const SECRET_PATH = path.join(STATE_ROOT, "rpc-secret.txt");
export const INSTALL_INFO_PATH = path.join(STATE_ROOT, "install.json");
export const RUNTIME_CONF_PATH = path.join(STATE_ROOT, "aria2.runtime.conf");

async function readText(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

export async function loadSettings(): Promise<Aria2Settings | null> {
  const raw = await readText(SETTINGS_PATH);
  if (raw === null) return null;
  try {
    return normalizeSettings(JSON.parse(raw) as Partial<Aria2Settings>);
  } catch {
    return null;
  }
}

export async function loadSettingsOrDefaults(): Promise<Aria2Settings> {
  return (await loadSettings()) ?? normalizeSettings({});
}

export async function readSecret(): Promise<string | null> {
  const raw = await readText(SECRET_PATH);
  const secret = raw?.trim();
  return secret ? secret : null;
}

export async function readInstallInfo(): Promise<InstallInfo | null> {
  const raw = await readText(INSTALL_INFO_PATH);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as InstallInfo;
  } catch {
    return null;
  }
}

export async function isEngineInitialized(): Promise<boolean> {
  const [settings, secret] = await Promise.all([loadSettings(), readSecret()]);
  return settings !== null && secret !== null;
}
