import { getPreferenceValues } from "@raycast/api";
import { resolveVideoBrowser } from "./browsers.js";

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

/** The yt-dlp options that come straight from preferences, for every video, audio and thumbnail download. */
export type VideoExtras = {
  /** The browser whose logins yt-dlp uses, when Video: Browser Cookies is on and a browser is chosen. */
  cookiesFromBrowser?: string;
  /** Why the chosen browser can't be used (no profile found, empty custom spec). The download shouldn't start. */
  cookieWarning?: string;
  embedMetadata: boolean;
  removeSponsors: boolean;
  forceIpv4: boolean;
};

export function getVideoExtras(): VideoExtras {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const browser = prefs.videoCookies
    ? resolveVideoBrowser(prefs.cookiesFromBrowser ?? "", prefs.cookiesFromBrowserCustom)
    : undefined;
  return {
    cookiesFromBrowser: browser?.spec || undefined,
    cookieWarning: browser?.warning,
    embedMetadata: !!prefs.videoEmbedMetadata,
    removeSponsors: !!prefs.videoSponsorBlock,
    forceIpv4: !!prefs.forceIpv4,
  };
}
