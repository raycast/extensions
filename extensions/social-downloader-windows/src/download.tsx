import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  getPreferenceValues,
  environment,
  open,
  openExtensionPreferences,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { download, executables, inspect } from "./downloader";
import { ensureTools, type Tools } from "./tools";
import { Workspace } from "./workspace";
import {
  audioChoices,
  hasAudio,
  videoChoices,
  validateUrl,
  type DownloadEvent,
  type DownloadOptions,
  type MediaFormat,
  type MediaInfo,
} from "./media";

function formatLabel(f: MediaFormat): string {
  return [
    f.height ? `${f.height}p` : undefined,
    f.fps ? `${f.fps} fps` : undefined,
    f.abr ? `${Math.round(f.abr)} kbps` : undefined,
    f.language,
    f.ext,
    f.format_note,
    `#${f.format_id}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default function Command() {
  const [tools, setTools] = useState<Tools>();
  const [status, setStatus] = useState("Preparing downloads…");
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const setup = useRef<AbortController | null>(null);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setup.current = controller;
    setError(undefined);
    setStatus("Preparing downloads…");
    void ensureTools(environment.supportPath, controller.signal, (message) => {
      if (!controller.signal.aborted) setStatus(message);
    })
      .then((ready) => {
        if (!controller.signal.aborted) setTools(ready);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            controller.signal.aborted
              ? "Setup canceled."
              : cause instanceof Error
                ? cause.message
                : String(cause),
          );
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt]);
  if (tools)
    return (
      <Workspace tools={tools} advanced={<DownloadCommand tools={tools} />} />
    );
  return (
    <Detail
      isLoading={!error}
      markdown={
        error
          ? `# Unable to Prepare Downloads\n\n${error}\n\nCheck your connection and try again.`
          : `# Setting Up the Extension\n\n${status}\n\nRequired components download automatically on first launch and are reused afterward.\n\nKeep this command open until it finishes.`
      }
      actions={
        <ActionPanel>
          {error ? (
            <Action
              title="Try Again"
              icon={Icon.ArrowClockwise}
              onAction={() => setAttempt((value) => value + 1)}
            />
          ) : (
            <Action
              title="Cancel Setup"
              icon={Icon.XMarkCircle}
              onAction={() => setup.current?.abort()}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function DownloadCommand({ tools }: { tools: Tools }) {
  const settings = getPreferenceValues<Preferences>();
  const paths = executables(settings);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string>();
  const [info, setInfo] = useState<MediaInfo>();
  const [mode, setMode] = useState<"video" | "audio">("video");
  const [video, setVideo] = useState("");
  const [audio, setAudio] = useState("");
  const [container, setContainer] =
    useState<DownloadOptions["container"]>("mp4");
  const [bitrate, setBitrate] = useState("192");
  const [folder, setFolder] = useState([paths.destination]);
  const [phase, setPhase] = useState<"idle" | "inspect" | "download" | "done">(
    "idle",
  );
  const [progress, setProgress] = useState<DownloadEvent>();
  const [file, setFile] = useState<string>();
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  const busy = phase === "inspect" || phase === "download";
  const videos = info ? videoChoices(info.formats) : [];
  const audios = info ? audioChoices(info.formats, mode === "video") : [];
  const selectedVideo = videos.find((f) => f.format_id === video);
  const combined = selectedVideo ? hasAudio(selectedVideo) : false;

  async function report(error: unknown) {
    if (mounted.current)
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to Complete",
        message: error instanceof Error ? error.message : String(error),
      });
  }

  async function analyze() {
    if (controller.current) return;
    let normalized: string;
    try {
      normalized = validateUrl(url);
    } catch (error) {
      setUrlError((error as Error).message);
      return;
    }
    const operation = new AbortController();
    controller.current = operation;
    setPhase("inspect");
    try {
      const result = await inspect(normalized, tools, operation.signal);
      if (!mounted.current) return;
      const availableVideo = videoChoices(result.formats);
      const initialMode = availableVideo.length ? "video" : "audio";
      const availableAudio = audioChoices(
        result.formats,
        initialMode === "video",
      );
      setUrl(normalized);
      setInfo(result);
      const defaultVideo = !availableAudio.length
        ? (availableVideo.find(hasAudio) ?? availableVideo[0])
        : availableVideo[0];
      setVideo(defaultVideo?.format_id ?? "");
      setAudio(availableAudio[0]?.format_id ?? "");
      setMode(initialMode);
      setContainer(initialMode === "video" ? "mp4" : "mp3");
    } catch (error) {
      await report(error);
    } finally {
      controller.current = null;
      if (mounted.current) setPhase("idle");
    }
  }

  async function start() {
    if (controller.current || !info) return;
    if (!folder[0]) {
      await report(new Error("Choose a destination folder."));
      return;
    }
    if (mode === "audio" && !audios.some((f) => f.format_id === audio)) {
      await report(new Error("Select an available audio track."));
      return;
    }
    if (
      mode === "video" &&
      (!selectedVideo ||
        (!combined &&
          audios.length > 0 &&
          !audios.some((f) => f.format_id === audio)))
    ) {
      await report(new Error("Select an available video track."));
      return;
    }
    const operation = new AbortController();
    controller.current = operation;
    setProgress(undefined);
    setPhase("download");
    try {
      const result = await download(
        {
          url,
          mode,
          video,
          audio: mode === "video" && combined ? "" : audio,
          container,
          bitrate,
          destination: folder[0],
          ffmpeg: tools.ffmpeg,
        },
        tools,
        operation.signal,
        (event) => {
          if (mounted.current) setProgress(event);
        },
      );
      if (!mounted.current) return;
      setFile(result);
      setPhase("done");
      await showToast({
        style: Toast.Style.Success,
        title: "Download Complete",
        message: info.title,
      });
    } catch (error) {
      if (mounted.current) setPhase("idle");
      await report(error);
    } finally {
      controller.current = null;
    }
  }

  const preferences = (
    <Action
      title="Configure Download Folder"
      icon={Icon.Gear}
      onAction={openExtensionPreferences}
    />
  );
  const cancel = (
    <Action
      title="Cancel Operation"
      icon={Icon.XMarkCircle}
      onAction={() => controller.current?.abort()}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
    />
  );
  if (phase === "download") {
    const p = progress?.type === "progress" ? progress : undefined;
    const percent =
      p?.percent === undefined
        ? "Waiting for progress…"
        : `${p.percent.toFixed(1)}% of current track`;
    return (
      <Detail
        isLoading
        markdown={`# Downloading Media\n\n${percent}\n\n${p?.speed ? `${(p.speed / 1024 / 1024).toFixed(2)} MB/s` : ""}\n\n${p?.eta ? `Estimated track time: ${Math.ceil(p.eta)} s` : ""}\n\nProgress may restart between video and audio. Final processing may take a few minutes.\n\nKeep this command open until it finishes. Closing it cancels the operation.`}
        actions={<ActionPanel>{cancel}</ActionPanel>}
      />
    );
  }
  if (phase === "done" && file)
    return (
      <Detail
        markdown="# Download Complete\n\nYour file is ready."
        actions={
          <ActionPanel>
            <Action
              title="Open File"
              icon={Icon.Play}
              onAction={() => open(file)}
            />
            <Action
              title="Show in Folder"
              icon={Icon.Folder}
              onAction={() => showInFinder(file)}
            />
            <Action
              title="Download Another Link"
              icon={Icon.Plus}
              onAction={() => {
                setInfo(undefined);
                setFile(undefined);
                setUrl("");
                setPhase("idle");
              }}
            />
          </ActionPanel>
        }
      />
    );

  if (!info)
    return (
      <Form
        isLoading={busy}
        actions={
          <ActionPanel>
            {busy ? (
              cancel
            ) : (
              <Action.SubmitForm
                title="Analyze Link"
                icon={Icon.MagnifyingGlass}
                onSubmit={analyze}
              />
            )}
            {preferences}
          </ActionPanel>
        }
      >
        <Form.TextField
          id="url"
          title="Link"
          placeholder="https://www.youtube.com/watch?v=…"
          value={url}
          error={urlError}
          onChange={(value) => {
            setUrl(value);
            setUrlError(undefined);
          }}
        />
        <Form.Description
          title="Platforms"
          text="Use one public video from a supported platform."
        />
        <Form.Description
          title="Ready to Download"
          text="Required components are ready. Choose where to save your downloads."
        />
      </Form>
    );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Download Media"
            icon={Icon.Download}
            onSubmit={start}
          />
          <Action
            title="Use Another Link"
            icon={Icon.ArrowLeft}
            onAction={() => setInfo(undefined)}
          />
          {preferences}
        </ActionPanel>
      }
    >
      <Form.Description
        title="Media"
        text={`${info.title}${info.uploader ? ` — ${info.uploader}` : ""}`}
      />
      <Form.Dropdown
        id="mode"
        title="Download"
        value={mode}
        onChange={(value) => {
          const next = value as "video" | "audio";
          setMode(next);
          setAudio(
            audioChoices(info.formats, next === "video")[0]?.format_id ?? "",
          );
          setContainer(next === "video" ? "mp4" : "mp3");
        }}
      >
        {videos.length > 0 && (
          <Form.Dropdown.Item value="video" title="Video" />
        )}
        {audioChoices(info.formats).length > 0 && (
          <Form.Dropdown.Item value="audio" title="Audio only" />
        )}
      </Form.Dropdown>
      {mode === "video" && (
        <Form.Dropdown
          id="video"
          title="Video Quality"
          value={video}
          onChange={setVideo}
        >
          {videos.map((f) => (
            <Form.Dropdown.Item
              key={f.format_id}
              value={f.format_id}
              title={formatLabel(f)}
            />
          ))}
        </Form.Dropdown>
      )}
      {(mode === "audio" || !combined) && audios.length > 0 && (
        <Form.Dropdown
          id="audio"
          title="Audio Track"
          value={audio}
          onChange={setAudio}
        >
          {audios.map((f) => (
            <Form.Dropdown.Item
              key={f.format_id}
              value={f.format_id}
              title={formatLabel(f)}
            />
          ))}
        </Form.Dropdown>
      )}
      {mode === "video" && (
        <Form.Description
          title="Audio"
          text={
            combined
              ? "This video track already includes audio."
              : audios.length
                ? "The selected audio track will be merged with the video."
                : "No audio is available for this track; the output will be silent."
          }
        />
      )}
      <Form.Dropdown
        id="container"
        title="Format"
        value={container}
        onChange={(v) => setContainer(v as DownloadOptions["container"])}
      >
        {(mode === "video" ? ["mp4", "mkv"] : ["mp3", "m4a"]).map((v) => (
          <Form.Dropdown.Item key={v} value={v} title={v.toUpperCase()} />
        ))}
      </Form.Dropdown>
      {mode === "audio" && (
        <Form.Dropdown
          id="bitrate"
          title="Conversion Bitrate"
          value={bitrate}
          onChange={setBitrate}
        >
          {["128", "192", "256", "320"].map((v) => (
            <Form.Dropdown.Item key={v} value={v} title={`${v} kbps`} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Description
        title="About the Format"
        text={
          mode === "video"
            ? "MP4/MKV preserve source codecs. If MP4 is incompatible, choose MKV."
            : "Conversion cannot improve source quality. Matching source formats may retain their original bitrate."
        }
      />
      <Form.FilePicker
        id="destination"
        title="Save To"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        value={folder}
        onChange={setFolder}
      />
    </Form>
  );
}
