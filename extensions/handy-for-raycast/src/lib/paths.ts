import { homedir } from "node:os";
import { join } from "node:path";

export const HANDY_SUPPORT_DIR = join(homedir(), "Library", "Application Support", "com.pais.handy");
export const DB_PATH = join(HANDY_SUPPORT_DIR, "history.db");
export const SETTINGS_PATH = join(HANDY_SUPPORT_DIR, "settings_store.json");
export const RECORDINGS_DIR = join(HANDY_SUPPORT_DIR, "recordings");
export const MODELS_DIR = join(HANDY_SUPPORT_DIR, "models");
export const HANDY_APP_PATH = "/Applications/Handy.app";

export function getHfHubCacheDir(): string {
  const hubCache = process.env.HF_HUB_CACHE?.trim();
  if (hubCache) return hubCache;
  const hfHome = process.env.HF_HOME?.trim();
  if (hfHome) return join(hfHome, "hub");
  const xdg = process.env.XDG_CACHE_HOME?.trim();
  if (xdg) return join(xdg, "huggingface", "hub");
  return join(homedir(), ".cache", "huggingface", "hub");
}

export const HF_HUB_CACHE_DIR = getHfHubCacheDir();

export function getHfHubCacheDirs(): string[] {
  const candidates = [
    getHfHubCacheDir(),
    join(homedir(), ".cache", "huggingface", "hub"),
    join(homedir(), "Library", "Caches", "huggingface", "hub"),
    join(HANDY_APP_PATH, "Data", "huggingface", "hub"),
    join(HANDY_APP_PATH, "Contents", "MacOS", "Data", "huggingface", "hub"),
  ];
  return [...new Set(candidates)];
}
