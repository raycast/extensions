import { homedir } from "os";
import { join } from "path";

const HANDY_SUPPORT_DIR = join(
  homedir(),
  "Library",
  "Application Support",
  "com.pais.handy",
);

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
