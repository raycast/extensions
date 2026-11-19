import { environment, getPreferenceValues } from "@raycast/api";
import os from "node:os";
import path from "node:path";
import { ensureRuntimeDirectories, expandTilde, normalizeServerUrl, resolveFfmpeg } from "./env";
import { RuntimeConfig } from "./types";

export function loadRuntimeConfig(): RuntimeConfig {
  const prefs = getPreferenceValues<Preferences>();
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
