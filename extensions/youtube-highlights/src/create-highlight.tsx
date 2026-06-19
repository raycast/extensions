import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  Clipboard,
  popToRoot,
  Icon,
  Color,
  Detail,
  getFrontmostApplication,
  confirmAlert,
  Alert,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { getYouTubeMetadata, VideoMetadata } from "./utils/browser";
import { saveHighlight, getVideoId, checkForDuplicate, updateHighlight, Highlight } from "./utils/storage";
import { isPro } from "./utils/feature-flags";
import { exportToMarkdown, exportToJSON, exportToCSV } from "./utils/export";
import { formatTime } from "./utils/format";
import { createLogger } from "./utils/logger";

const logger = createLogger("CreateHighlight");

interface Preferences {
  highlightDuration: string;
  autoExport: boolean;
  exportFormat: "markdown" | "json" | "csv";
  showNoteInput: boolean;
}

function NoteInputForm({ highlight, onDone }: { highlight: Highlight; onDone: () => void }) {
  const { pop } = useNavigation();
  const [note, setNote] = useState("");

  const handleSubmit = async () => {
    if (note.trim()) {
      await updateHighlight(highlight.id, { text: note });
      await showToast({ style: Toast.Style.Success, title: "Note Added" });
    }
    onDone();
    pop();
  };

  return (
    <List searchBarPlaceholder="Add a note (optional)..." onSearchTextChange={setNote}>
      <List.Item
        title="Press Enter to Save Note"
        subtitle={note ? `Note: ${note}` : "Or Escape to skip"}
        icon={Icon.Pencil}
        actions={
          <ActionPanel>
            <Action title="Save Note" onAction={handleSubmit} />
          </ActionPanel>
        }
      />
    </List>
  );
}

export default function Command() {
  const [state, setState] = useState<{
    isLoading: boolean;
    videos: VideoMetadata[];
    error?: string;
    createdHighlight?: Highlight;
  }>({
    isLoading: true,
    videos: [],
  });

  const hasAutoExecuted = useRef(false);

  const preferences = getPreferenceValues<Preferences>();
  const duration = parseInt(preferences.highlightDuration) || 30;

  const handleAutoExport = async (highlight: Highlight) => {
    if (preferences.autoExport && (await isPro())) {
      try {
        const list = [highlight];
        switch (preferences.exportFormat) {
          case "json":
            await exportToJSON(list);
            break;
          case "csv":
            await exportToCSV(list);
            break;

          default:
            await exportToMarkdown(list);
            break;
        }
      } catch (e) {
        logger.error("Auto-export failed:", e);
        await showToast({ style: Toast.Style.Failure, title: "Auto-Export Failed", message: String(e) });
      }
    }
  };

  const createHighlight = async (video: VideoMetadata, overrideTime?: number) => {
    logger.info("Command: Creating highlight for:", { title: video.title, status: video.status });

    if (video.status === "no_video") {
      logger.warn("Command: Video status is no_video");
      await showToast({
        style: Toast.Style.Failure,
        title: "No Video Found",
        message: "YouTube tab found, but no video playing.",
      });
      return;
    }

    try {
      if (video.videoType === "ad") {
        logger.info("Command: Video is an ad, aborting.");
        await showToast({
          style: Toast.Style.Failure,
          title: "Cannot highlight Ad",
          message: "Wait for the ad to finish.",
        });
        return;
      }

      const endTime = overrideTime !== undefined ? overrideTime : video.currentTime;
      const startTime = Math.max(0, endTime - duration);
      const videoId = getVideoId(video.url);

      const duplicate = await checkForDuplicate(videoId, startTime, endTime);
      if (duplicate) {
        const confirmed = await confirmAlert({
          title: "Duplicate Highlight",
          message: "A similar highlight already exists. Create anyway?",
          primaryAction: { title: "Create Anyway", style: Alert.ActionStyle.Destructive },
        });

        if (!confirmed) return;
      }

      logger.debug(`Command: Time range: ${startTime} - ${endTime} (Duration: ${duration})`);

      if (isNaN(startTime) || isNaN(endTime)) {
        throw new Error("Invalid time data");
      }

      const formattedStart = formatTime(startTime);
      const formattedEnd = formatTime(endTime);

      const message = `Captured [${formattedStart} - ${formattedEnd}] from "${video.title}"`;

      const separator = video.url.includes("?") ? "&" : "?";
      const timestampUrl = `${video.url}${separator}t=${Math.floor(startTime)}s`;

      const newHighlight = await saveHighlight({
        videoId: videoId,
        userId: "local-user",
        startTime,
        endTime,
        text: "",
        color: "#FFC107",
        tags: [],
        isPublic: false,
        videoTitle: video.title,
        videoUrl: video.url,
        videoChannel: "",
        videoDuration: 0,

        browser: video.browser,
        videoType: video.videoType,
      });

      await Clipboard.copy(`${message}\nURL: ${timestampUrl}`);
      logger.info("Command: Highlight saved and copied to clipboard");

      await showToast({
        style: Toast.Style.Success,
        title: "Highlight Saved",
        message: "Saved to library and copied to clipboard",
      });

      await handleAutoExport(newHighlight);

      if (preferences.showNoteInput) {
        setState((s) => ({
          ...s,
          createdHighlight: newHighlight,
          isLoading: false,
        }));
      } else {
        popToRoot();
      }
    } catch (error) {
      logger.error("Command: Error creating highlight:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  useEffect(() => {
    async function fetch() {
      if (hasAutoExecuted.current) {
        logger.debug("Command: Already auto-executed, skipping fetch.");
        return;
      }

      try {
        logger.info("Command: Fetching videos...");

        try {
          const frontmost = await getFrontmostApplication();
          logger.debug("Command: Frontmost App:", { name: frontmost.name });
        } catch (e) {
          logger.debug("Command: Could not get frontmost app:", e);
        }

        const videos = await getYouTubeMetadata();
        logger.info("Command: Fetched videos count:", { count: videos.length });

        if (!videos || videos.length === 0) {
          logger.info("Command: No videos found, exiting");
          await showToast({
            style: Toast.Style.Failure,
            title: "No YouTube Video Found",
            message: "Open a YouTube video in Arc first.",
          });
          popToRoot();
          return;
        }

        logger.debug("Command: Setting state with videos");
        setState({ isLoading: false, videos });

        if (videos.length === 1) {
          if (hasAutoExecuted.current) return;
          hasAutoExecuted.current = true;

          logger.info("Command: Auto-selecting single video");
          await createHighlight(videos[0]);
        }
      } catch (e) {
        logger.error("Command: Error fetching videos:", e);
        setState({ isLoading: false, videos: [], error: String(e) });
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: String(e),
        });
      }
    }
    fetch();
  }, []);

  if (state.error) {
    return <Detail markdown={`# Error\n\n${state.error}`} />;
  }

  if (state.createdHighlight) {
    return <NoteInputForm highlight={state.createdHighlight} onDone={() => popToRoot()} />;
  }

  return (
    <List isLoading={state.isLoading} searchBarPlaceholder="Select video to highlight...">
      {state.videos.map((video, index) => (
        <List.Item
          key={index}
          title={video.title}
          subtitle={`${formatTime(video.currentTime)} • ${video.browser}`}
          icon={video.videoType === "short" ? Icon.Mobile : video.videoType === "live" ? Icon.Livestream : Icon.Video}
          accessories={[
            { text: video.videoType.toUpperCase(), tooltip: "Video Type" },
            ...(video.isMiniplayer
              ? [
                  {
                    text: "Miniplayer",
                    icon: Icon.Warning,
                    tooltip: "Detected in Miniplayer (Title might be incorrect)",
                  },
                ]
              : []),
            ...(video.videoType === "ad" ? [{ text: "Ad", icon: { source: Icon.Warning, tintColor: Color.Red } }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action title="Create Highlight" onAction={() => createHighlight(video)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
