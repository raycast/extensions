import { Action, ActionPanel, Detail, Icon, environment, open, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  getBundledShortcutPath,
  isProxyShortcutInstalled,
  openShortcutFile,
  openShortcutsApp,
  runProxyShortcut,
  SHORTCUT_NAME,
  type ShortcutProxySuccess,
} from "./lib/shortcuts-proxy";

type ViewState =
  | { phase: "checking"; message: string }
  | { phase: "needs_setup"; message: string }
  | { phase: "idle"; message: string }
  | { phase: "running"; message: string }
  | { phase: "success"; result: ShortcutProxySuccess }
  | { phase: "no_match"; message?: string }
  | { phase: "error"; message: string; details?: string };

type AssetPaths = {
  bundledShortcutPath?: string;
};

const WAVE_BARS = 23;
const WAVE_FRAME_MS = 33;
const WAVE_LOOP_MS = 2400;
const WAVE_LOOP_FRAMES = Math.round(WAVE_LOOP_MS / WAVE_FRAME_MS);

// Shortcuts reports no progress while it listens, so show a smooth waveform plus an elapsed timer instead of a fake bar.
function renderWaveformFrame(frameIndex: number) {
  const phase = (2 * Math.PI * frameIndex) / WAVE_LOOP_FRAMES;
  const width = 460;
  const height = 120;
  const barWidth = 10;
  const step = width / WAVE_BARS;
  const bars = Array.from({ length: WAVE_BARS }, (_, i) => {
    const envelope = Math.pow(Math.sin((Math.PI * (i + 0.5)) / WAVE_BARS), 1.4);
    // Whole numbers of cycles per loop, so the last frame flows into the first.
    const wobble = Math.abs(Math.sin(2 * phase + i * 0.55) * Math.sin(phase - i * 0.21));
    const barHeight = 10 + (height - 14) * envelope * (0.25 + 0.75 * wobble);
    const x = i * step + (step - barWidth) / 2;
    const opacity = 0.45 + 0.55 * envelope;
    return `<rect x="${x.toFixed(1)}" y="${((height - barHeight) / 2).toFixed(1)}" width="${barWidth}" height="${barHeight.toFixed(1)}" rx="${barWidth / 2}" fill="#0F88FF" fill-opacity="${opacity.toFixed(2)}"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${bars}</svg>`;
  return `![Listening](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}?raycast-width=${width}&raycast-height=${height})`;
}

// Built once, so each animation tick only swaps in a ready-made frame.
const waveformFrames = Array.from({ length: WAVE_LOOP_FRAMES }, (_, i) => renderWaveformFrame(i));

function listeningMarkdown(frameIndex: number) {
  const seconds = Math.floor((frameIndex * WAVE_FRAME_MS) / 1000);
  return [
    "# Listening…",
    "",
    waveformFrames[frameIndex % WAVE_LOOP_FRAMES],
    "",
    `Listening for music… ${seconds}s`,
  ].join("\n");
}

function baseActions(options: {
  state: ViewState;
  assets: AssetPaths;
  onRecheck: () => void;
  onOpenBundledShortcut: () => Promise<void>;
  onOpenShortcutsApp: () => Promise<void>;
}) {
  const { state, assets } = options;
  const installAction = assets.bundledShortcutPath ? (
    <Action title="Install Shortcut" icon={Icon.Download} onAction={options.onOpenBundledShortcut} />
  ) : null;
  const recheckAction = <Action title="Recheck Shortcut" icon={Icon.ArrowClockwise} onAction={options.onRecheck} />;

  return (
    <>
      {state.phase === "needs_setup" ? installAction : recheckAction}
      {state.phase === "needs_setup" ? recheckAction : installAction}
      <Action title="Open Shortcuts App" icon={Icon.AppWindow} onAction={options.onOpenShortcutsApp} />
    </>
  );
}

function markdownForState(state: ViewState, animationFrame = 0) {
  switch (state.phase) {
    case "checking":
      return `# Checking Setup\n\n${state.message}`;
    case "needs_setup":
      return [
        "# Setup Required",
        "",
        "Install the shortcut before using this command.",
        "",
        "Once the shortcut is installed, relaunch this command.",
      ].join("\n");
    case "idle":
      return `# Ready\n\n${state.message}\n\nPress **Start Recognition** to run the Shortcuts proxy and wait for the Shazam action to complete.`;
    case "running":
      return listeningMarkdown(animationFrame);
    case "no_match":
      return `# No Match\n\n${state.message ?? "No song was recognized."}\n\nTry again with louder audio and less background noise.`;
    case "error":
      return `# Error\n\n${state.message}${state.details ? `\n\n\`\`\`\n${state.details}\n\`\`\`` : ""}`;
    case "success": {
      const { result } = state;
      const artworkSource = result.artworkPath ? pathToFileURL(result.artworkPath).href : result.artworkUrl;
      const lines = [`# ${result.title}`];
      if (artworkSource) {
        lines.push("", `![Artwork](${artworkSource}?raycast-width=220&raycast-height=220)`);
      }
      return lines.join("\n");
    }
  }
}

function copySongLine(result: ShortcutProxySuccess) {
  return result.artist ? `${result.title} - ${result.artist}` : result.title;
}

function searchQueryForResult(result: ShortcutProxySuccess) {
  return result.artist ? `${result.title} ${result.artist}` : result.title;
}

function spotifySearchUrl(result: ShortcutProxySuccess) {
  return `https://open.spotify.com/search/${encodeURIComponent(searchQueryForResult(result))}`;
}

function appleMusicWebSearchUrl(result: ShortcutProxySuccess) {
  return `https://music.apple.com/us/search?term=${encodeURIComponent(searchQueryForResult(result))}`;
}

function youtubeMusicSearchUrl(result: ShortcutProxySuccess) {
  return `https://music.youtube.com/search?q=${encodeURIComponent(searchQueryForResult(result))}`;
}

function youtubeSearchUrl(result: ShortcutProxySuccess) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQueryForResult(result))}`;
}

const appleMusicActionIcon = { source: path.join(environment.assetsPath, "applemusic.png") };
const spotifyActionIcon = { source: path.join(environment.assetsPath, "spotify.png") };
const youtubeMusicActionIcon = { source: path.join(environment.assetsPath, "yt-music.png") };
const youtubeActionIcon = { source: path.join(environment.assetsPath, "youtube.png") };
const shazamActionIcon = { source: path.join(environment.assetsPath, "shazam.png") };

function SongMetadata({ result }: { result: ShortcutProxySuccess }) {
  return (
    <Detail.Metadata>
      {result.artist ? <Detail.Metadata.Label title="Artist" text={result.artist} /> : null}
      {result.album ? <Detail.Metadata.Label title="Album" text={result.album} /> : null}
      {result.appleMusicUrl || result.shazamUrl ? <Detail.Metadata.Separator /> : null}
      {result.appleMusicUrl ? (
        <Detail.Metadata.Link title="Apple Music" text="Open" target={result.appleMusicUrl} />
      ) : null}
      {result.shazamUrl ? <Detail.Metadata.Link title="Shazam" text="Open" target={result.shazamUrl} /> : null}
    </Detail.Metadata>
  );
}

export default function IdentifySongCommand() {
  const [state, setState] = useState<ViewState>({ phase: "checking", message: "Checking Shortcuts backend…" });
  const [assets, setAssets] = useState<AssetPaths>({});
  const [animationFrame, setAnimationFrame] = useState(0);
  const isRecognitionRunningRef = useRef(false);

  async function runRecognitionFlow() {
    if (isRecognitionRunningRef.current) {
      return;
    }

    isRecognitionRunningRef.current = true;
    setState({ phase: "checking", message: "Checking whether the proxy shortcut is installed…" });

    try {
      const [installed, bundledShortcutPath] = await Promise.all([
        isProxyShortcutInstalled(),
        getBundledShortcutPath(),
      ]);
      setAssets({ bundledShortcutPath });

      if (!installed) {
        setState({ phase: "needs_setup", message: "The proxy shortcut is not installed yet." });
        return;
      }

      setState({ phase: "running", message: `Shortcut "${SHORTCUT_NAME}" detected. Launching the Shortcuts proxy…` });
      const result = await runProxyShortcut({
        timeoutMs: 45_000,
        onStatus: (message) => {
          setState({ phase: "running", message });
        },
      });

      if (result.kind === "match") {
        setState({ phase: "success", result: result.payload });
        return;
      }

      if (result.kind === "no_match") {
        setState({ phase: "no_match", message: result.message });
        return;
      }

      setState({ phase: "error", message: result.message, details: result.stderr });
    } catch (error) {
      setState({ phase: "error", message: error instanceof Error ? error.message : String(error) });
    } finally {
      isRecognitionRunningRef.current = false;
    }
  }

  async function refreshInstallationState() {
    await runRecognitionFlow();
  }

  useEffect(() => {
    void refreshInstallationState();
  }, []);

  useEffect(() => {
    if (state.phase !== "running") {
      setAnimationFrame(0);
      return;
    }

    const timer = setInterval(() => {
      setAnimationFrame((frame) => frame + 1);
    }, WAVE_FRAME_MS);

    return () => clearInterval(timer);
  }, [state.phase]);

  async function startRecognition() {
    if (state.phase !== "idle" && state.phase !== "success" && state.phase !== "no_match" && state.phase !== "error") {
      return;
    }

    await runRecognitionFlow();
  }

  async function openBundledShortcutAction() {
    if (!assets.bundledShortcutPath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Bundled shortcut not found",
        message: "Add a .shortcut file to assets to enable one-click installation.",
      });
      return;
    }

    try {
      await openShortcutFile(assets.bundledShortcutPath);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot open shortcut file",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function openShortcutsAppAction() {
    try {
      await openShortcutsApp();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot open Shortcuts.app",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const isLoading = state.phase === "checking" || state.phase === "running";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdownForState(state, animationFrame)}
      metadata={state.phase === "success" ? <SongMetadata result={state.result} /> : undefined}
      actions={
        <ActionPanel>
          {state.phase !== "needs_setup" && state.phase !== "checking" ? (
            <Action title="Start Recognition" icon={Icon.Microphone} onAction={() => void startRecognition()} />
          ) : null}
          {state.phase === "success" && state.result.appleMusicUrl ? (
            <Action
              title="Open in Apple Music"
              onAction={() => void open(state.result.appleMusicUrl!)}
              icon={appleMusicActionIcon}
            />
          ) : null}
          {state.phase === "success" ? (
            <Action
              title="Search on Spotify"
              icon={spotifyActionIcon}
              onAction={() => void open(spotifySearchUrl(state.result))}
            />
          ) : null}
          {state.phase === "success" ? (
            <Action
              title="Search on Apple Music"
              icon={appleMusicActionIcon}
              onAction={() => void open(appleMusicWebSearchUrl(state.result))}
            />
          ) : null}
          {state.phase === "success" ? (
            <Action
              title="Search on YouTube Music"
              icon={youtubeMusicActionIcon}
              onAction={() => void open(youtubeMusicSearchUrl(state.result))}
            />
          ) : null}
          {state.phase === "success" ? (
            <Action
              title="Search on YouTube"
              icon={youtubeActionIcon}
              onAction={() => void open(youtubeSearchUrl(state.result))}
            />
          ) : null}
          {state.phase === "success" && state.result.shazamUrl ? (
            <Action
              title="Open in Shazam"
              icon={shazamActionIcon}
              onAction={() => void open(state.result.shazamUrl!)}
            />
          ) : null}
          {baseActions({
            state,
            assets,
            onRecheck: () => void refreshInstallationState(),
            onOpenBundledShortcut: openBundledShortcutAction,
            onOpenShortcutsApp: openShortcutsAppAction,
          })}
          {state.phase === "success" ? (
            <Action.CopyToClipboard title="Copy Song Info" content={copySongLine(state.result)} />
          ) : null}
          {state.phase === "success" ? (
            <Action.CopyToClipboard
              title="Copy Raw JSON"
              icon={Icon.Clipboard}
              content={JSON.stringify(state.result, null, 2)}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
