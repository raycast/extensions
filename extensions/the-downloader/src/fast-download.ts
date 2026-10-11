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
import { LiveStreamError, runVideoDownload } from "./lib/ytdlp.js";
import { ensureFreshTools, hintOutdatedTool } from "./lib/tool-updates.js";
import { isLoginRequiredError, runGalleryDownload } from "./lib/gallerydl.js";
import { resolveBrowser } from "./lib/browsers.js";
import { AbortError } from "./lib/run.js";
import { needsRosetta, RosettaRequiredError } from "./lib/managed-binary.js";
import { runSpotdlDownload, SpotdlDownloadError } from "./lib/spotdl.js";
import { SPOTDL_SETUP_GUIDE_URL } from "./lib/docs.js";
import { reserveWebpagePath, runMonolithSave } from "./lib/monolith.js";
import { progressMessage } from "./lib/format.js";
import { DownloadKind, DownloadSession } from "./lib/download-session.js";
import { entryFromSnapshot, recordDownload } from "./lib/history.js";
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
  normalizeUrl,
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

/** Make Stop the toast's first action and return the AbortSignal the runner consumes. */
function attachStop(toast: Toast): { signal: AbortSignal } {
  const controller = new AbortController();
  toast.primaryAction = { title: "Stop Download", onAction: () => controller.abort() };
  return { signal: controller.signal };
}

/** Track a download without a view, so it lands in the Download History like the form's do. */
function track(kind: DownloadKind, url: string, format?: string): DownloadSession {
  return new DownloadSession({ kind, url, folder: downloadPath, format });
}

/** Record the outcome the toast now shows. Cancelled downloads are not recorded. */
function settle(session: DownloadSession, toast: Toast, outcome: { filePath?: string; error?: unknown }) {
  if (toast.style === Toast.Style.Success) {
    session.succeed({ filePath: outcome.filePath || undefined, title: toast.title, message: toast.message });
  } else {
    session.fail({ title: toast.title, message: toast.message, cancelled: isAbort(outcome.error) });
  }
  return recordDownload(entryFromSnapshot(session.getSnapshot()));
}

function paintCancelled(toast: Toast) {
  toast.style = Toast.Style.Failure;
  toast.title = "Cancelled";
  toast.message = undefined;
  toast.primaryAction = undefined;
  toast.secondaryAction = undefined;
}

export default async function FastDownload(props: LaunchProps<{ arguments: Arguments.FastDownload }>): Promise<void> {
  const { url: rawUrl } = props.arguments;

  if (!isValidUrl(rawUrl)) {
    await showToast({ style: Toast.Style.Failure, title: "Invalid URL", message: rawUrl });
    return;
  }
  // Prefix https:// for scheme-less input before any runner sees it.
  const url = normalizeUrl(rawUrl);

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
    await ensureFreshTools(["gallery-dl"]);

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
    const session = track("gallery", url);
    let outcome: { error?: unknown } = {};
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
          session.count(p.files);
        },
      );
      if (files === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "Nothing downloaded";
        toast.message = "gallery-dl found no new files — they may already exist, or the gallery needs a login.";
        toast.primaryAction = { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() };
        toast.secondaryAction = undefined;
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "Downloaded";
        toast.message = `${files} files`;
        toast.primaryAction = { title: "Open Folder", onAction: () => open(downloadPath) };
        toast.secondaryAction = undefined;
      }
    } catch (error) {
      outcome = { error };
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
        await hintOutdatedTool(toast, "gallery-dl");
      }
    }
    await settle(session, toast, outcome);
    return;
  }

  if (type === "spotify") {
    const spotdlPath = getSpotdlPath();
    const ffmpegPath = getffmpegPath();
    if (!fs.existsSync(spotdlPath)) return handOff("spotdl", url);
    if (!fs.existsSync(ffmpegPath)) return handOff("ffmpeg", url);
    await ensureFreshTools(["spotdl", "ffmpeg"]);

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
        onAction: () => open(SPOTDL_SETUP_GUIDE_URL),
      };
      return;
    }

    const { signal } = attachStop(toast);
    const session = track("spotify", url, spotifyAudioFormat.toUpperCase());
    let outcome: { error?: unknown } = {};
    try {
      // Surface the friendly Rosetta hint for an already-present x86_64 binary
      // on an Apple Silicon Mac without Rosetta, instead of a raw "Bad CPU type".
      if (needsRosetta(spotdlPath)) throw new RosettaRequiredError();
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
          session.count(p.tracks);
        },
      );
      if (tracks === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "Nothing downloaded";
        toast.message =
          "spotDL saved no tracks. The playlist may be private or empty; for private playlists, turn on Spotify: User Authentication.";
        toast.primaryAction = { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() };
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "Downloaded";
        toast.message = `${tracks} tracks`;
        toast.primaryAction = { title: "Open Folder", onAction: () => open(downloadPath) };
      }
      toast.secondaryAction = undefined;
    } catch (error) {
      outcome = { error };
      if (isAbort(error)) {
        paintCancelled(toast);
      } else if (error instanceof RosettaRequiredError) {
        toast.style = Toast.Style.Failure;
        toast.title = "spotDL needs Rosetta 2";
        toast.message = error.message;
        toast.primaryAction = { title: "Copy Error", onAction: () => Clipboard.copy(error.message) };
        toast.secondaryAction = undefined;
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
            onAction: () => open(SPOTDL_SETUP_GUIDE_URL),
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
        await hintOutdatedTool(toast, "spotdl");
      }
    }
    await settle(session, toast, outcome);
    return;
  }

  if (type === "webpage") {
    const monolithPath = getMonolithPath();
    if (!fs.existsSync(monolithPath)) return handOff("monolith", url);
    await ensureFreshTools(["monolith"]);

    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving Webpage" });
    const { signal } = attachStop(toast);
    const session = track(
      "website",
      url,
      webpageSaveMode === "lightweight" ? "Lightweight (no JavaScript)" : "Complete",
    );
    let outcome: { filePath?: string; error?: unknown } = {};
    try {
      const { filePath } = await runMonolithSave(monolithPath, {
        url,
        outputPath: reserveWebpagePath(downloadPath, url),
        noJavaScript: webpageSaveMode === "lightweight",
        idleMs: getIdleTimeoutMs(),
        abortSignal: signal,
      });
      outcome = { filePath };
      toast.style = Toast.Style.Success;
      toast.title = "Saved";
      toast.message = path.basename(filePath);
      toast.primaryAction = { title: "Open Folder", onAction: () => showInFinder(filePath) };
      toast.secondaryAction = undefined;
    } catch (error) {
      outcome = { error };
      if (isAbort(error)) {
        paintCancelled(toast);
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Save Failed";
        toast.message = errorMessage(error);
        toast.primaryAction = { title: "Copy Error", onAction: () => Clipboard.copy(errorMessage(error)) };
        toast.secondaryAction = undefined;
        await hintOutdatedTool(toast, "monolith");
      }
    }
    await settle(session, toast, outcome);
    return;
  }

  // video — the default route (detectSource routes unknown hosts to "webpage", handled above)
  const ytdlPath = getytdlPath();
  const ffmpegPath = getffmpegPath();
  const ffprobePath = getffprobePath();
  // Deno is optional: yt-dlp only needs a JS runtime for some extractors
  // (e.g. YouTube), so a missing Deno must not block sites that work without it.
  const denoPath = getDenoPath();
  const deno = fs.existsSync(denoPath) ? denoPath : undefined;
  if (!fs.existsSync(ytdlPath)) return handOff("yt-dlp", url);
  if (!fs.existsSync(ffmpegPath)) return handOff("ffmpeg", url);
  if (!fs.existsSync(ffprobePath)) return handOff("ffprobe", url);

  // Outdated tools are the usual cause of failed downloads (yt-dlp's HTTP 403s):
  // offer to update before starting. Declining (or a failed update) just carries
  // on with the download — the same check guards the other routes above.
  await ensureFreshTools(["yt-dlp", "ffmpeg", "ffprobe", "deno"]);

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
  const session = track(
    config.videoMediaType === "audio" ? "audio" : "video",
    url,
    config.videoMediaType === "audio"
      ? config.audioFormat.toUpperCase()
      : `${config.videoQuality === "best" ? "Best" : config.videoQuality === "smallest" ? "Smallest" : `${config.videoQuality}p`} · ${config.videoContainer.toUpperCase()}`,
  );
  let outcome: { filePath?: string; error?: unknown } = {};
  try {
    const { filePath } = await runVideoDownload(
      ytdlPath,
      { url, format, outputTemplate, ffmpegPath, denoPath: deno, idleMs: getIdleTimeoutMs(), abortSignal: signal },
      () => undefined,
      (event) => {
        session.ytdlp(event);
        if (event.type === "progress") toast.message = progressMessage(session.getSnapshot()) || toast.message;
      },
    );
    outcome = { filePath };
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
    outcome = { error };
    if (isAbort(error)) {
      paintCancelled(toast);
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Download Failed";
      toast.message = errorMessage(error);
      toast.primaryAction = { title: "Copy Error", onAction: () => Clipboard.copy(errorMessage(error)) };
      toast.secondaryAction = undefined;
      // A live stream isn't a tool problem, so no "update yt-dlp" hint for it.
      if (!(error instanceof LiveStreamError)) await hintOutdatedTool(toast, "yt-dlp");
    }
  }
  await settle(session, toast, outcome);
}
