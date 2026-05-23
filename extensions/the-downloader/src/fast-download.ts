import fs from "node:fs";
import path from "node:path";
import {
  Clipboard,
  LaunchProps,
  LaunchType,
  Toast,
  environment,
  getPreferenceValues,
  launchCommand,
  open,
  openExtensionPreferences,
  showInFinder,
  showToast,
} from "@raycast/api";
import { detectSource } from "./lib/detect.js";
import { getConfig } from "./lib/config.js";
import { composeVideoFormat } from "./lib/video-format.js";
import { runVideoDownload } from "./lib/ytdlp.js";
import { isLoginRequiredError, runGalleryDownload } from "./lib/gallerydl.js";
import { resolveBrowser } from "./lib/browsers.js";
import { AbortError } from "./lib/run.js";
import { runSpotdlDownload, SpotdlDownloadError } from "./lib/spotdl.js";
import { runMonolithSave, webpageFilename } from "./lib/monolith.js";
import {
  downloadPath,
  getDenoPath,
  getGalleryDlPath,
  getIdleTimeoutMs,
  getMonolithPath,
  getSpotdlPath,
  getffmpegPath,
  getffprobePath,
  getytdlPath,
  isValidUrl,
} from "./utils.js";

/** A no-view command cannot render the Installer view, so a missing tool is
 *  handed off to the main Download command, which can. */
async function handOff(tool: string, url: string): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: `${tool} Is Not Installed`,
    message: "Open The Downloader to install it, then download again.",
    primaryAction: {
      title: "Set Up The Downloader",
      onAction: async () => {
        try {
          await launchCommand({ name: "index", type: LaunchType.UserInitiated, context: { url } });
        } catch {
          /* the Download command is the primary command and is always enabled */
        }
      },
    },
  });
}

/** Turn a thrown value into a human-readable message. */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

/** True when the error came from the user pressing Stop on the toast. Lets the caller paint a neutral "Cancelled" instead of a red error. */
function isAbort(error: unknown): boolean {
  return error instanceof AbortError;
}

/** Wire a Stop action to the toast and return the AbortSignal the runner consumes. */
function attachStop(toast: Toast): { signal: AbortSignal } {
  const controller = new AbortController();
  toast.secondaryAction = { title: "Stop", onAction: () => controller.abort() };
  return { signal: controller.signal };
}

function paintCancelled(toast: Toast) {
  toast.style = Toast.Style.Failure;
  toast.title = "Cancelled";
  toast.message = undefined;
  toast.primaryAction = undefined;
  toast.secondaryAction = undefined;
}

export default async function FastDownload(props: LaunchProps<{ arguments: Arguments.FastDownload }>): Promise<void> {
  const { url } = props.arguments;

  if (!isValidUrl(url)) {
    await showToast({ style: Toast.Style.Failure, title: "Invalid URL", message: url });
    return;
  }

  const {
    cookiesFromBrowser,
    cookiesFromBrowserCustom,
    spotifyAudioFormat,
    spotifyClientId,
    spotifyClientSecret,
    spotifyUserAuth,
    webpageSaveMode,
  } = getPreferenceValues<ExtensionPreferences>();
  const type = detectSource(url);

  if (type === "gallery") {
    const galleryDlPath = getGalleryDlPath();
    if (!fs.existsSync(galleryDlPath)) return handOff("gallery-dl", url);

    const browser = resolveBrowser(cookiesFromBrowser, cookiesFromBrowserCustom);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading Gallery", message: "0 files" });

    if (browser.warning) {
      toast.style = Toast.Style.Failure;
      toast.title = "Cookies from Browser";
      toast.message = browser.warning;
      toast.primaryAction = { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() };
      return;
    }

    const { signal } = attachStop(toast);
    try {
      const { files } = await runGalleryDownload(
        galleryDlPath,
        {
          url,
          destination: downloadPath,
          cookiesFromBrowser: browser.spec || undefined,
          idleMs: getIdleTimeoutMs(),
          abortSignal: signal,
        },
        (p) => {
          toast.message = `${p.files} files`;
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = "Downloaded";
      toast.message = `${files} files`;
      toast.primaryAction = { title: "Open Folder", onAction: () => open(downloadPath) };
      toast.secondaryAction = undefined;
    } catch (error) {
      if (isAbort(error)) {
        paintCancelled(toast);
      } else if (isLoginRequiredError(error)) {
        toast.style = Toast.Style.Failure;
        toast.title = "Login Required";
        toast.message = browser.label
          ? `Sign in to the site in ${browser.label}, or change the browser in preferences.`
          : "Set Gallery: Cookies from Browser in preferences to use your browser's session.";
        toast.primaryAction = { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() };
        toast.secondaryAction = undefined;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Download Failed";
        toast.message = errorMessage(error);
        toast.primaryAction = { title: "Copy Error", onAction: () => Clipboard.copy(errorMessage(error)) };
        toast.secondaryAction = undefined;
      }
    }
    return;
  }

  if (type === "spotify") {
    const spotdlPath = getSpotdlPath();
    const ffmpegPath = getffmpegPath();
    if (!fs.existsSync(spotdlPath)) return handOff("spotdl", url);
    if (!fs.existsSync(ffmpegPath)) return handOff("ffmpeg", url);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Downloading from Spotify",
      message: "0 tracks",
    });

    const clientId = spotifyClientId?.trim();
    const clientSecret = spotifyClientSecret?.trim();
    if (!clientId || !clientSecret) {
      toast.style = Toast.Style.Failure;
      toast.title = "Spotify credentials missing";
      toast.message =
        "Open extension preferences and set Spotify: Client ID and Client Secret. The setup guide explains how to get them.";
      toast.primaryAction = { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() };
      toast.secondaryAction = {
        title: "Open Setup Guide",
        onAction: () => open("https://github.com/sth3no/the-downloader/blob/main/SPOTIFY.md"),
      };
      return;
    }

    const { signal } = attachStop(toast);
    try {
      const { tracks } = await runSpotdlDownload(
        spotdlPath,
        {
          url,
          destination: downloadPath,
          format: spotifyAudioFormat,
          ffmpegPath,
          clientId,
          clientSecret,
          userAuth: spotifyUserAuth,
          supportDir: environment.supportPath,
          idleMs: getIdleTimeoutMs(),
          abortSignal: signal,
        },
        (p) => {
          toast.message = `${p.tracks} tracks`;
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = "Downloaded";
      toast.message = `${tracks} tracks`;
      toast.primaryAction = { title: "Open Folder", onAction: () => open(downloadPath) };
      toast.secondaryAction = undefined;
    } catch (error) {
      if (isAbort(error)) {
        paintCancelled(toast);
      } else if (error instanceof SpotdlDownloadError) {
        const partial =
          error.tracks > 0 ? `Downloaded ${error.tracks} track${error.tracks === 1 ? "" : "s"} before failure. ` : "";
        toast.style = Toast.Style.Failure;
        toast.title = error.summary.title;
        toast.message = partial + error.summary.message;
        toast.primaryAction = { title: "Copy Full Error", onAction: () => Clipboard.copy(error.rawOutput) };
        if (error.summary.action === "open-preferences") {
          toast.secondaryAction = { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() };
        } else if (error.summary.action === "open-setup-guide") {
          toast.secondaryAction = {
            title: "Open Setup Guide",
            onAction: () => open("https://github.com/sth3no/the-downloader/blob/main/SPOTIFY.md"),
          };
        } else {
          toast.secondaryAction = undefined;
        }
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Download Failed";
        toast.message = errorMessage(error);
        toast.primaryAction = { title: "Copy Error", onAction: () => Clipboard.copy(errorMessage(error)) };
        toast.secondaryAction = undefined;
      }
    }
    return;
  }

  if (type === "webpage") {
    const monolithPath = getMonolithPath();
    if (!fs.existsSync(monolithPath)) return handOff("monolith", url);

    const outputPath = path.join(downloadPath, webpageFilename(url));
    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving Webpage" });
    const { signal } = attachStop(toast);
    try {
      const { filePath } = await runMonolithSave(monolithPath, {
        url,
        outputPath,
        noJavaScript: webpageSaveMode === "lightweight",
        idleMs: getIdleTimeoutMs(),
        abortSignal: signal,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Saved";
      toast.message = path.basename(filePath);
      toast.primaryAction = { title: "Open Folder", onAction: () => showInFinder(filePath) };
      toast.secondaryAction = undefined;
    } catch (error) {
      if (isAbort(error)) {
        paintCancelled(toast);
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Save Failed";
        toast.message = errorMessage(error);
        toast.primaryAction = { title: "Copy Error", onAction: () => Clipboard.copy(errorMessage(error)) };
        toast.secondaryAction = undefined;
      }
    }
    return;
  }

  // video — the default route (detectSource routes unknown hosts to "webpage", handled above)
  const ytdlPath = getytdlPath();
  const ffmpegPath = getffmpegPath();
  const ffprobePath = getffprobePath();
  const denoPath = getDenoPath();
  if (!fs.existsSync(ytdlPath)) return handOff("yt-dlp", url);
  if (!fs.existsSync(ffmpegPath)) return handOff("ffmpeg", url);
  if (!fs.existsSync(ffprobePath)) return handOff("ffprobe", url);
  if (!fs.existsSync(denoPath)) return handOff("deno", url);

  const config = getConfig();
  const format = composeVideoFormat({
    mediaType: config.videoMediaType,
    quality: config.videoQuality,
    container: config.videoContainer,
    audioFormat: config.audioFormat,
  });
  const outputTemplate = path.join(downloadPath, "%(title)s (%(id)s).%(ext)s");

  const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading Video", message: "0%" });
  const { signal } = attachStop(toast);
  try {
    const { filePath } = await runVideoDownload(
      ytdlPath,
      { url, format, outputTemplate, ffmpegPath, denoPath, idleMs: getIdleTimeoutMs(), abortSignal: signal },
      (percent) => {
        toast.message = `${Math.floor(percent)}%`;
      },
    );
    toast.style = Toast.Style.Success;
    toast.title = "Downloaded";
    toast.message = filePath ? path.basename(filePath) : "Video";
    toast.primaryAction = {
      title: "Open Folder",
      onAction: () => (filePath ? showInFinder(filePath) : open(downloadPath)),
    };
    if (filePath) {
      toast.secondaryAction = { title: "Copy to Clipboard", onAction: () => Clipboard.copy({ file: filePath }) };
    } else {
      toast.secondaryAction = undefined;
    }
  } catch (error) {
    if (isAbort(error)) {
      paintCancelled(toast);
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Download Failed";
      toast.message = errorMessage(error);
      toast.primaryAction = { title: "Copy Error", onAction: () => Clipboard.copy(errorMessage(error)) };
      toast.secondaryAction = undefined;
    }
  }
}
