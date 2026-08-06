import { homedir } from "os";
import { isAbsolute, join } from "path";

const HANDY_APP_ID = "com.pais.handy";

export function getHandySupportDir(
  platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
  home = homedir(),
): string {
  if (platform === "darwin") {
    return join(home, "Library", "Application Support", HANDY_APP_ID);
  }

  const dataDir =
    env.XDG_DATA_HOME && isAbsolute(env.XDG_DATA_HOME)
      ? env.XDG_DATA_HOME
      : join(home, ".local", "share");
  return join(dataDir, HANDY_APP_ID);
}

const HANDY_SUPPORT_DIR = getHandySupportDir();

export const DB_PATH = join(HANDY_SUPPORT_DIR, "history.db");
export const SETTINGS_PATH = join(HANDY_SUPPORT_DIR, "settings_store.json");
export const RECORDINGS_DIR = join(HANDY_SUPPORT_DIR, "recordings");

/**
 * Legacy / custom models directory. Since Handy adopted transcribe.cpp (#1529)
 * the built-in models download through hf-hub into the HuggingFace cache (see
 * `HF_HUB_CACHE_DIR`); this directory is now only used for user-supplied custom
 * `.bin` / `.gguf` models that Handy auto-discovers.
 */
export const MODELS_DIR = join(HANDY_SUPPORT_DIR, "models");

/**
 * HuggingFace hub cache, where Handy's built-in GGUF models actually live, in
 * the form `models--{org}--{repo}/snapshots/{rev}/{file}.gguf`. Resolution
 * mirrors hf-hub's `Cache::from_env` (the crate Handy uses): `HF_HUB_CACHE`
 * wins, else `HF_HOME/hub`, else `~/.cache/huggingface/hub`.
 */
export const HF_HUB_CACHE_DIR = process.env.HF_HUB_CACHE
  ? process.env.HF_HUB_CACHE
  : process.env.HF_HOME
    ? join(process.env.HF_HOME, "hub")
    : join(homedir(), ".cache", "huggingface", "hub");
