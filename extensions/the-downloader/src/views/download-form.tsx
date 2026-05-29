import { useEffect, useMemo, useRef, useState } from "react";
import fs from "node:fs";
import path from "node:path";
import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  Toast,
  environment,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  showHUD,
  showInFinder,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { detectSource } from "../lib/detect.js";
import {
  Filetype,
  clampFiletype,
  defaultFiletype,
  filetypeGuidance,
  requiredTools,
  resolveTool,
  supportedFiletypes,
} from "../lib/filetype.js";
import { composeVideoFormat } from "../lib/video-format.js";
import { fetchVideoInfo, runThumbnailDownload, runVideoDownload } from "../lib/ytdlp.js";
import { isLoginRequiredError, runGalleryDownload } from "../lib/gallerydl.js";
import { resolveBrowser } from "../lib/browsers.js";
import { AbortError } from "../lib/run.js";
import { isAppleSilicon, isRosettaInstalled, RosettaRequiredError } from "../lib/managed-binary.js";
import { runSpotdlDownload, SpotdlDownloadError } from "../lib/spotdl.js";
import { runMonolithSave, webpageFilename } from "../lib/monolith.js";
import extractTranscript from "../transcript.js";
import {
  downloadPath,
  formatHHMM,
  getDenoPath,
  getFormats,
  getFormatTitle,
  getFormatValue,
  getGalleryDlPath,
  getIdleTimeoutMs,
  getMonolithPath,
  getSpotdlPath,
  getffmpegPath,
  getffprobePath,
  getytdlPath,
  isValidUrl,
  normalizeUrl,
  sanitizeVideoTitle,
} from "../utils.js";
import Installer from "./installer.js";
import Updater from "./updater.js";

const prefs = getPreferenceValues<ExtensionPreferences>();

/** Required-tool name → its filesystem-path resolver. */
const TOOL_PATH: Record<string, () => string> = {
  "yt-dlp": getytdlPath,
  ffmpeg: getffmpegPath,
  ffprobe: getffprobePath,
  deno: getDenoPath,
  "gallery-dl": getGalleryDlPath,
  spotdl: getSpotdlPath,
  monolith: getMonolithPath,
};

const FILETYPE_TITLE: Record<Filetype, string> = {
  video: "Video",
  audio: "Audio",
  image: "Image",
  transcript: "Transcript",
  website: "Website",
};

const FILETYPE_ICON: Record<Filetype, Icon> = {
  video: Icon.Video,
  audio: Icon.Music,
  image: Icon.Image,
  transcript: Icon.Document,
  website: Icon.Globe,
};

const SPOTDL_SETUP_GUIDE_URL = "https://github.com/sth3no/the-downloader/blob/main/SPOTIFY.md";

/** Turn a rejected runner into a red, copyable failure toast — or a neutral "Cancelled" toast when the user pressed Stop. */
function failToast(toast: Toast, error: unknown) {
  // Clear the in-flight "Stop" action up front — every failure path below
  // either sets its own secondary action or wants none, and a dead Stop
  // button left over from startAbortable would do nothing.
  toast.secondaryAction = undefined;
  if (error instanceof AbortError) {
    toast.style = Toast.Style.Failure;
    toast.title = "Cancelled";
    toast.message = undefined;
    toast.primaryAction = undefined;
    return;
  }
  if (error instanceof RosettaRequiredError) {
    toast.style = Toast.Style.Failure;
    toast.title = "spotDL needs Rosetta 2";
    toast.message = error.message;
    return;
  }
  if (error instanceof SpotdlDownloadError) {
    const partial =
      error.tracks > 0 ? `Downloaded ${error.tracks} track${error.tracks === 1 ? "" : "s"} before failure. ` : "";
    toast.style = Toast.Style.Failure;
    toast.title = error.summary.title;
    toast.message = partial + error.summary.message;
    toast.primaryAction = { title: "Copy Full Error", onAction: () => Clipboard.copy(error.rawOutput) };
    if (error.summary.action === "open-preferences") {
      toast.secondaryAction = { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() };
    } else if (error.summary.action === "open-setup-guide") {
      toast.secondaryAction = { title: "Open Setup Guide", onAction: () => open(SPOTDL_SETUP_GUIDE_URL) };
    }
    return;
  }
  const message = error instanceof Error ? error.message : "Unknown error";
  toast.style = Toast.Style.Failure;
  toast.title = "Download Failed";
  toast.message = message;
  toast.primaryAction = { title: "Copy Error", onAction: () => Clipboard.copy(message) };
}

type DownloadFormProps = { initialUrl: string };

export function DownloadForm({ initialUrl }: DownloadFormProps) {
  const audioPreferred = prefs.videoMediaType === "audio";

  const [url, setUrl] = useState(initialUrl);
  const [filetype, setFiletype] = useState<Filetype>(() =>
    isValidUrl(initialUrl) ? defaultFiletype(detectSource(initialUrl), audioPreferred) : "video",
  );
  const [filetypeTouched, setFiletypeTouched] = useState(false);
  const [refresh, setRefresh] = useState(0);
  // Ref (not state) so a rapid second submit sees the flag synchronously — a
  // re-render would race with the click. Refs update inside the same event
  // loop turn that set them.
  const submitInFlight = useRef(false);
  // Controller for the in-flight runner. Set on submit, used by the Stop
  // toast action AND by the component-unmount cleanup so a dismissed form
  // does not leave zombie yt-dlp / gallery-dl / monolith / spotdl children
  // attached to the user's Raycast process.
  const activeAbort = useRef<AbortController | null>(null);
  // Controller for the metadata (--dump-json) fetch. usePromise replaces this on
  // every re-run and aborts the prior one, so editing the URL or dismissing the
  // form kills the in-flight yt-dlp metadata child instead of orphaning it.
  const metaAbortable = useRef<AbortController>(null);

  useEffect(() => {
    return () => {
      activeAbort.current?.abort();
    };
  }, []);

  /**
   * Wire an AbortController to a toast: returns the signal for the runner
   * options and a `done()` to call on completion. The toast gains a "Stop"
   * secondary action that aborts the in-flight child, and the controller is
   * tracked so unmount cleanup can kill anything still running.
   */
  function startAbortable(toast: Toast): { signal: AbortSignal; done: () => void } {
    const controller = new AbortController();
    activeAbort.current = controller;
    toast.secondaryAction = { title: "Stop", onAction: () => controller.abort() };
    return {
      signal: controller.signal,
      done: () => {
        if (activeAbort.current === controller) activeAbort.current = null;
      },
    };
  }

  const validUrl = isValidUrl(url);
  const source = useMemo(() => detectSource(url), [url]);
  const ytdlpBound = resolveTool(source, filetype) === "yt-dlp";

  // Keep Filetype valid for the URL: snap to the source default until the user
  // overrides it, and — even after they override — clamp to a supported type
  // when the detected source can't do the current pick (e.g. Video was selected,
  // then a Pinterest link is pasted, which only supports Image).
  useEffect(() => {
    if (!validUrl) return;
    const src = detectSource(url);
    setFiletype((current) =>
      filetypeTouched ? clampFiletype(src, current, audioPreferred) : defaultFiletype(src, audioPreferred),
    );
  }, [url, filetypeTouched, validUrl, audioPreferred]);

  // The required tools must all exist; otherwise the form is replaced by the Installer.
  const missingTool = useMemo(
    () => (validUrl ? requiredTools(source, filetype).find((name) => !fs.existsSync(TOOL_PATH[name]())) : undefined),
    [source, filetype, validUrl, refresh],
  );

  // yt-dlp metadata — fetched only for a yt-dlp-bound selection with its tools present.
  const shouldFetchMeta = ytdlpBound && validUrl && !missingTool;
  const { data: video, isLoading: metaLoading } = usePromise(
    async (u: string, fetchIt: boolean) => {
      if (!fetchIt) return undefined;
      const denoPath = getDenoPath();
      const data = await fetchVideoInfo(
        getytdlPath(),
        u,
        prefs.forceIpv4,
        fs.existsSync(denoPath) ? denoPath : undefined,
        {
          signal: metaAbortable.current?.signal,
          timeoutMs: getIdleTimeoutMs(),
        },
      );
      return { ...data, title: sanitizeVideoTitle(data.title) };
    },
    [url, shouldFetchMeta],
    { onError: () => undefined, abortable: metaAbortable },
  );

  const liveStream = !!video && video.live_status !== undefined && video.live_status !== "not_live";

  if (missingTool) {
    return <Installer executable={missingTool} onRefresh={() => setRefresh((r) => r + 1)} />;
  }

  // The adaptive status line.
  let statusLabel = "Status";
  let statusText = "Paste a link to download.";
  if (validUrl) {
    if (ytdlpBound && video) {
      statusLabel = "Title";
      statusText = video.duration ? `${video.title} · ${formatHHMM(video.duration)}` : video.title;
    } else if (ytdlpBound && metaLoading) {
      statusText = "Fetching details…";
    } else if (ytdlpBound) {
      statusText = "Ready to download.";
    } else {
      // gallery / spotify / webpage — explain what this source supports and why.
      statusText = filetypeGuidance(source);
    }
  }

  const urlError =
    url && !validUrl
      ? "Enter a valid URL"
      : liveStream && (filetype === "video" || filetype === "audio" || filetype === "transcript")
        ? "Live streams are not supported"
        : undefined;

  async function handleSubmit(values: Form.Values) {
    // Reject re-entrant submits while a download is in flight — a double-press
    // of ⌘⏎ would otherwise fire two downloads to the same output template,
    // racing for the same file and corrupting both.
    if (submitInFlight.current) {
      await showToast({ style: Toast.Style.Failure, title: "A download is already running" });
      return;
    }
    const rawUrl = String(values.url ?? "").trim();
    if (!isValidUrl(rawUrl)) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a valid URL" });
      return;
    }
    // Prefix https:// for scheme-less input before any runner sees it (monolith
    // treats a bare host as a local file path).
    const submitUrl = normalizeUrl(rawUrl);
    const ft = values.filetype as Filetype;
    const src = detectSource(submitUrl);
    const folder = (values.destination as string[] | undefined)?.[0] ?? downloadPath;

    if (liveStream && (ft === "video" || ft === "audio" || ft === "transcript")) {
      await showToast({ style: Toast.Style.Failure, title: "Live streams are not supported" });
      return;
    }

    submitInFlight.current = true;
    try {
      await runSubmit(submitUrl, ft, src, folder, values);
    } finally {
      submitInFlight.current = false;
    }
  }

  async function runSubmit(
    submitUrl: string,
    ft: Filetype,
    src: ReturnType<typeof detectSource>,
    folder: string,
    values: Form.Values,
  ) {
    if (ft === "website") {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Saving Webpage" });
      const { signal, done } = startAbortable(toast);
      try {
        const { filePath } = await runMonolithSave(getMonolithPath(), {
          url: submitUrl,
          outputPath: path.join(folder, webpageFilename(submitUrl)),
          noJavaScript: values.saveMode === "lightweight",
          idleMs: getIdleTimeoutMs(),
          abortSignal: signal,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Webpage Saved";
        toast.message = path.basename(filePath);
        toast.primaryAction = { title: "Open Folder", onAction: () => showInFinder(filePath) };
        toast.secondaryAction = { title: "Open File", onAction: () => open(filePath) };
      } catch (error) {
        failToast(toast, error);
      } finally {
        done();
      }
      return;
    }

    if (ft === "transcript") {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Extracting Transcript" });
      const { signal, done } = startAbortable(toast);
      try {
        const { transcript, title } = await extractTranscript(submitUrl, "en", signal);
        const filePath = path.join(folder, `${title}.txt`);
        // Defense in depth: sanitizeVideoTitle already strips separators, but
        // assert the resolved path stays inside the chosen folder before writing
        // so a pathological title can never escape it.
        if (path.relative(folder, filePath).startsWith("..")) {
          throw new Error("Refusing to write the transcript outside the chosen folder.");
        }
        fs.writeFileSync(filePath, transcript, "utf-8");
        toast.style = Toast.Style.Success;
        toast.title = "Transcript Saved";
        toast.message = `${title}.txt`;
        toast.primaryAction = { title: "Open", onAction: () => open(filePath) };
        toast.secondaryAction = { title: "Copy Transcript", onAction: () => Clipboard.copy(transcript) };
      } catch (error) {
        failToast(toast, error);
      } finally {
        done();
      }
      return;
    }

    if (ft === "image" && src === "gallery") {
      const browser = resolveBrowser(prefs.cookiesFromBrowser, prefs.cookiesFromBrowserCustom);
      const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading Gallery", message: "0 files" });

      if (browser.warning) {
        toast.style = Toast.Style.Failure;
        toast.title = "Cookies from Browser";
        toast.message = browser.warning;
        toast.primaryAction = { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() };
        return;
      }

      const { signal, done } = startAbortable(toast);
      try {
        const { files } = await runGalleryDownload(
          getGalleryDlPath(),
          {
            url: submitUrl,
            destination: folder,
            cookiesFromBrowser: browser.spec || undefined,
            idleMs: getIdleTimeoutMs(),
            abortSignal: signal,
          },
          (p) => {
            toast.message = `${p.files} files`;
          },
        );
        if (files === 0) {
          // Exit 0 with nothing new is not a real "success" — surface it
          // honestly instead of a green "0 files" toast.
          toast.style = Toast.Style.Failure;
          toast.title = "Nothing downloaded";
          toast.message = "gallery-dl found no new files — they may already exist, or the gallery needs a login.";
          toast.primaryAction = { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() };
          toast.secondaryAction = undefined;
        } else {
          toast.style = Toast.Style.Success;
          toast.title = "Gallery Downloaded";
          toast.message = `${files} files`;
          toast.primaryAction = { title: "Open Folder", onAction: () => open(folder) };
          toast.secondaryAction = undefined;
        }
      } catch (error) {
        if (isLoginRequiredError(error)) {
          toast.style = Toast.Style.Failure;
          toast.title = "Login Required";
          toast.message = browser.label
            ? `Sign in to the site in ${browser.label}, or change the browser in preferences.`
            : "Set Gallery: Cookies from Browser in preferences to use your browser's session.";
          toast.primaryAction = { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() };
          toast.secondaryAction = undefined;
        } else {
          failToast(toast, error);
        }
      } finally {
        done();
      }
      return;
    }

    if (ft === "image") {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading Thumbnail" });
      const { signal, done } = startAbortable(toast);
      try {
        const { filePath } = await runThumbnailDownload(getytdlPath(), {
          url: submitUrl,
          outputTemplate: path.join(folder, "%(title)s (%(id)s).%(ext)s"),
          idleMs: getIdleTimeoutMs(),
          abortSignal: signal,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Thumbnail Saved";
        toast.message = filePath ? path.basename(filePath) : undefined;
        toast.primaryAction = {
          title: "Open Folder",
          onAction: () => (filePath ? showInFinder(filePath) : open(folder)),
        };
        if (filePath) {
          toast.secondaryAction = { title: "Open File", onAction: () => open(filePath) };
        } else {
          toast.secondaryAction = undefined;
        }
      } catch (error) {
        failToast(toast, error);
      } finally {
        done();
      }
      return;
    }

    if (ft === "audio" && src === "spotify") {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Downloading from Spotify",
        message: "0 tracks",
      });

      // Read credentials fresh on submit so prefs edited while the form is open
      // are picked up without re-launching the command.
      const livePrefs = getPreferenceValues<ExtensionPreferences>();
      const clientId = livePrefs.spotifyClientId?.trim();
      const clientSecret = livePrefs.spotifyClientSecret?.trim();
      const userAuth = livePrefs.spotifyUserAuth;
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

      const { signal, done } = startAbortable(toast);
      try {
        // A managed spotDL binary that already exists (e.g. installed before the
        // Rosetta guard, or copied from another machine) would otherwise fail
        // with a cryptic "Bad CPU type". Surface the friendly hint instead.
        if (isAppleSilicon() && !isRosettaInstalled()) throw new RosettaRequiredError();
        const { tracks } = await runSpotdlDownload(
          getSpotdlPath(),
          {
            url: submitUrl,
            destination: folder,
            // Honor the live audioFmt dropdown (the only place FLAC is offered);
            // fall back to the freshly-read preference. Previously this used the
            // stale module-level pref and silently ignored the dropdown.
            format: String(values.audioFmt ?? livePrefs.spotifyAudioFormat),
            ffmpegPath: getffmpegPath(),
            clientId,
            clientSecret,
            userAuth,
            supportDir: environment.supportPath,
            idleMs: getIdleTimeoutMs(),
            abortSignal: signal,
          },
          (p) => {
            toast.message = `${p.tracks} tracks`;
          },
        );
        toast.style = Toast.Style.Success;
        toast.title = "Download Complete";
        toast.message = `${tracks} tracks`;
        toast.primaryAction = { title: "Open Folder", onAction: () => open(folder) };
        toast.secondaryAction = undefined;
      } catch (error) {
        failToast(toast, error);
      } finally {
        done();
      }
      return;
    }

    // video, or audio on a non-Spotify site → yt-dlp.
    const format =
      ft === "audio"
        ? composeVideoFormat({
            mediaType: "audio",
            quality: "best",
            container: "mp4",
            audioFormat: String(values.audioFmt ?? prefs.audioFormat),
          })
        : values.exactFormat && values.exactFormat !== "auto"
          ? String(values.exactFormat)
          : composeVideoFormat({
              mediaType: "video",
              quality: String(values.quality ?? prefs.videoQuality),
              container: String(values.container ?? prefs.videoContainer),
              audioFormat: prefs.audioFormat,
            });
    const denoPath = getDenoPath();
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: ft === "audio" ? "Downloading Audio" : "Downloading Video",
      message: "0%",
    });
    const { signal, done } = startAbortable(toast);
    try {
      const { filePath } = await runVideoDownload(
        getytdlPath(),
        {
          url: submitUrl,
          format,
          outputTemplate: path.join(folder, "%(title)s (%(id)s).%(ext)s"),
          ffmpegPath: getffmpegPath(),
          denoPath: fs.existsSync(denoPath) ? denoPath : undefined,
          idleMs: getIdleTimeoutMs(),
          abortSignal: signal,
        },
        (percent) => {
          toast.message = `${Math.floor(percent)}%`;
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = "Downloaded";
      toast.message = filePath ? path.basename(filePath) : undefined;
      toast.primaryAction = {
        title: "Open Folder",
        onAction: () => (filePath ? showInFinder(filePath) : open(folder)),
      };
      if (filePath) {
        toast.secondaryAction = {
          title: "Copy to Clipboard",
          onAction: () => {
            Clipboard.copy({ file: filePath });
            showHUD("Copied to Clipboard");
          },
        };
      } else {
        toast.secondaryAction = undefined;
      }
    } catch (error) {
      failToast(toast, error);
    } finally {
      done();
    }
  }

  return (
    <Form
      isLoading={metaLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Download} title="Download" onSubmit={handleSubmit} />
          <ActionPanel.Section>
            <Action.Push icon={Icon.Hammer} title="Update Libraries" target={<Updater />} />
            <Action.OpenInBrowser
              icon={Icon.Info}
              title="About This Extension"
              url="https://github.com/sth3no/the-downloader/blob/main/ABOUT.md"
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      searchBarAccessory={
        <Form.LinkAccessory
          text="Supported Sites"
          target="https://github.com/sth3no/the-downloader/blob/main/SUPPORTED_SITES.md"
        />
      }
    >
      <Form.Description title={statusLabel} text={statusText} />
      <Form.TextField
        id="url"
        title="URL"
        autoFocus
        value={url}
        error={urlError}
        onChange={setUrl}
        placeholder="https://www.youtube.com/watch?v=ykaj0pS4A1A"
      />
      {validUrl && (
        <>
          <Form.Dropdown
            id="filetype"
            title="Filetype"
            value={filetype}
            info={filetypeGuidance(source)}
            onChange={(next) => {
              setFiletype(next as Filetype);
              setFiletypeTouched(true);
            }}
          >
            {supportedFiletypes(source).map((ft) => (
              <Form.Dropdown.Item key={ft} value={ft} title={FILETYPE_TITLE[ft]} icon={FILETYPE_ICON[ft]} />
            ))}
          </Form.Dropdown>

          {filetype === "video" && (
            <>
              <Form.Dropdown id="quality" title="Quality" defaultValue={prefs.videoQuality}>
                <Form.Dropdown.Item value="best" title="Best Available" />
                <Form.Dropdown.Item value="1080" title="1080p" />
                <Form.Dropdown.Item value="720" title="720p" />
                <Form.Dropdown.Item value="480" title="480p" />
                <Form.Dropdown.Item value="smallest" title="Smallest File" />
              </Form.Dropdown>
              <Form.Dropdown id="container" title="Container" defaultValue={prefs.videoContainer}>
                <Form.Dropdown.Item value="mp4" title="MP4" />
                <Form.Dropdown.Item value="mkv" title="MKV" />
                <Form.Dropdown.Item value="webm" title="WebM" />
              </Form.Dropdown>
              {prefs.exactFormatSelection && (
                <Form.Dropdown id="exactFormat" title="Exact Format" defaultValue="auto">
                  <Form.Dropdown.Item value="auto" title="Auto — use Quality + Container above" />
                  {video &&
                    getFormats(video).Video.map((f) => (
                      <Form.Dropdown.Item key={f.format_id} value={getFormatValue(f)} title={getFormatTitle(f)} />
                    ))}
                </Form.Dropdown>
              )}
            </>
          )}

          {filetype === "audio" && (
            <Form.Dropdown
              id="audioFmt"
              key={`audioFmt-${source}`}
              title="Format"
              defaultValue={source === "spotify" ? prefs.spotifyAudioFormat : prefs.audioFormat}
            >
              <Form.Dropdown.Item value="mp3" title="MP3" />
              <Form.Dropdown.Item value="m4a" title="M4A" />
              <Form.Dropdown.Item value="opus" title="Opus" />
              {source === "spotify" && <Form.Dropdown.Item value="flac" title="FLAC" />}
            </Form.Dropdown>
          )}

          {filetype === "website" && (
            <Form.Dropdown id="saveMode" title="Save Mode" defaultValue={prefs.webpageSaveMode}>
              <Form.Dropdown.Item value="complete" title="Complete (embed everything)" />
              <Form.Dropdown.Item value="lightweight" title="Lightweight (no JavaScript)" />
            </Form.Dropdown>
          )}

          <Form.FilePicker
            id="destination"
            title="Folder"
            allowMultipleSelection={false}
            canChooseDirectories
            canChooseFiles={false}
            defaultValue={[downloadPath]}
          />
        </>
      )}
    </Form>
  );
}
