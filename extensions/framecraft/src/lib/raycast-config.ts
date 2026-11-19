import { environment, getPreferenceValues } from "@raycast/api";
import os from "node:os";
import path from "node:path";
import { ensureRuntimeDirectories, expandTilde, normalizeServerUrl, resolveFfmpeg } from "./env";
import { RuntimeConfig, SubtitleMode } from "./types";

interface RawPreferences {
  jellyfinUrl?: string;
  jellyfinApiKey?: string;
  jellyfinUsername?: string;
  saveDirectory?: string;
  defaultSubtitleMode?: SubtitleMode;
  ffmpegPath?: string;
  bypassProxy?: boolean;
  copyToClipboard?: boolean;
}

export function loadRuntimeConfig(): RuntimeConfig {
  const prefs = getPreferenceValues<RawPreferences>();
  const { ffmpegPath, ffprobePath } = resolveFfmpeg(prefs.ffmpegPath);
  const saveDirectory = expandTilde(prefs.saveDirectory?.trim() || path.join(os.homedir(), "Pictures", "FrameCraft"));
  const jellyfinUrl = normalizeServerUrl(prefs.jellyfinUrl ?? "");

  const config: RuntimeConfig = {
    jellyfinUrl,
    jellyfinApiKey: (prefs.jellyfinApiKey ?? "").trim(),
    jellyfinUsername: (prefs.jellyfinUsername ?? "").trim(),
    saveDirectory,
    defaultSubtitleMode: prefs.defaultSubtitleMode ?? "primary",
    ffmpegPath,
    ffprobePath,
    bypassProxy: prefs.bypassProxy ?? true,
    copyToClipboard: prefs.copyToClipboard ?? true,
    supportPath: environment.supportPath,
    assetsPath: environment.assetsPath,
  };

  ensureRuntimeDirectories(config);
  return config;
}
