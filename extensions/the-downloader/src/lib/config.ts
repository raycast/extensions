import { getPreferenceValues } from "@raycast/api";

export { videoFormatSelector } from "./video-format.js";

export type VideoMediaType = "video" | "audio";

/** Per-content-type download defaults, read from extension preferences. */
export type DownloaderConfig = {
  videoMediaType: VideoMediaType;
  videoQuality: string;
  videoContainer: string;
  audioFormat: string;
  webpageSaveMode: string;
};

/** Read the per-content-type download defaults from extension preferences. */
export function getConfig(): DownloaderConfig {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  return {
    videoMediaType: prefs.videoMediaType,
    videoQuality: prefs.videoQuality,
    videoContainer: prefs.videoContainer,
    audioFormat: prefs.audioFormat,
    webpageSaveMode: prefs.webpageSaveMode,
  };
}
