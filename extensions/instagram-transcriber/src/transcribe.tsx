import {
  ActionPanel,
  Action,
  showToast,
  Toast,
  Detail,
  List,
  useNavigation,
  getPreferenceValues,
  LocalStorage,
  Clipboard,
  Icon,
  closeMainWindow,
} from "@raycast/api";
import React, { useState } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import axios from "axios";
import FormData from "form-data";
import { createReadStream } from "fs";

const execAsync = promisify(exec);

interface Preferences {
  whisperApiKey?: string;
}

interface VideoMetadata {
  username?: string;
  fullName?: string;
  thumbnail?: string;
  title?: string;
  description?: string;
  duration?: number;
  viewCount?: number;
  likeCount?: number;
}

interface TranscriptHistoryItem {
  id: string;
  url: string;
  transcript: string;
  timestamp: number;
  videoId: string;
  metadata?: VideoMetadata;
}

const HISTORY_STORAGE_KEY = "transcript-history";

export default function Command() {
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [recentHistory, setRecentHistory] = useState<TranscriptHistoryItem[]>(
    [],
  );
  const [filteredHistory, setFilteredHistory] = useState<
    TranscriptHistoryItem[]
  >([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  React.useEffect(() => {
    loadRecentHistory();
  }, []);

  React.useEffect(() => {
    filterHistory();
  }, [searchText, recentHistory]);

  async function loadRecentHistory() {
    setIsLoadingHistory(true);
    try {
      const history = await getHistory();
      // Show all history items
      setRecentHistory(history);
      setFilteredHistory(history);
    } catch (error) {
      console.error("Failed to load history:", error);
      setRecentHistory([]);
      setFilteredHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }

  function filterHistory() {
    const isValidUrl =
      searchText.trim() && validateInstagramUrl(searchText.trim());

    if (!searchText.trim() || isValidUrl) {
      // Show all history if search is empty or it's a valid URL
      setFilteredHistory(recentHistory);
      return;
    }

    // Filter history based on search text
    const searchLower = searchText.toLowerCase();
    const filtered = recentHistory.filter(
      (item) =>
        item.transcript.toLowerCase().includes(searchLower) ||
        item.url.toLowerCase().includes(searchLower) ||
        item.videoId.toLowerCase().includes(searchLower) ||
        item.metadata?.username?.toLowerCase().includes(searchLower) ||
        item.metadata?.title?.toLowerCase().includes(searchLower) ||
        item.metadata?.description?.toLowerCase().includes(searchLower),
    );
    setFilteredHistory(filtered);
  }

  async function handleTranscribe(url: string) {
    if (!validateInstagramUrl(url)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid URL",
        message: "Please enter a valid Instagram video URL",
      });
      return;
    }

    if (!preferences.whisperApiKey) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API Key Required",
        message: "Please add your OpenAI API key in preferences",
      });
      return;
    }

    setIsProcessing(true);
    let toast: Toast | null = null;

    try {
      // Check cache first
      const videoId = extractVideoId(url);
      const cacheKey = `transcript-${videoId}`;
      const cached = await LocalStorage.getItem(cacheKey);

      if (cached && typeof cached === "string") {
        // Try to get cached metadata
        const metadataKey = `metadata-${videoId}`;
        const cachedMetadata = await LocalStorage.getItem(metadataKey);
        const metadata = cachedMetadata
          ? (JSON.parse(cachedMetadata as string) as VideoMetadata)
          : undefined;

        // Ensure it's in history too
        await addToHistory(url, cached, videoId, metadata);
        await loadRecentHistory();

        toast = await showToast({
          style: Toast.Style.Success,
          title: "Retrieved from cache",
        });
        await Clipboard.copy(cached);
        // Find the item ID for navigation
        const historyItems = await getHistory();
        const historyItem = historyItems.find(
          (item) => extractVideoId(item.url) === videoId,
        );
        push(
          <TranscriptView
            transcript={cached}
            url={url}
            metadata={metadata}
            currentItemId={historyItem?.id}
          />,
        );
        return;
      }

      // Show initial progress
      toast = await showToast({
        style: Toast.Style.Animated,
        title: "Starting transcription...",
        message: "Preparing to download video",
      });

      // Transcribe using Whisper API with progress updates
      const result = await transcribeVideo(
        url,
        preferences,
        async (progress) => {
          await showToast({
            style: Toast.Style.Animated,
            title: progress.title,
            message: progress.message,
          });
        },
      );

      // Cache result
      await LocalStorage.setItem(cacheKey, result.transcript);
      if (result.metadata && Object.keys(result.metadata).length > 0) {
        await LocalStorage.setItem(
          `metadata-${videoId}`,
          JSON.stringify(result.metadata),
        );
      }

      // Save to history
      await addToHistory(url, result.transcript, videoId, result.metadata);
      await loadRecentHistory();

      // Copy to clipboard automatically
      await Clipboard.copy(result.transcript);

      toast.style = Toast.Style.Success;
      toast.title = "Transcription complete!";
      toast.message = "Transcript copied to clipboard";

      // Find the item ID for navigation (it was just added, so should be first in history)
      const historyItems = await getHistory();
      const historyItem = historyItems.find((item) => item.url === url);
      push(
        <TranscriptView
          transcript={result.transcript}
          url={url}
          metadata={result.metadata}
          currentItemId={historyItem?.id}
        />,
      );
    } catch (error) {
      console.error(error);
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = "Transcription failed";
        toast.message =
          error instanceof Error ? error.message : "Unknown error";
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Transcription failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } finally {
      setIsProcessing(false);
    }
  }

  function handleSearchSubmit() {
    if (searchText.trim()) {
      handleTranscribe(searchText.trim());
      setSearchText("");
    }
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  function truncateTranscript(
    transcript: string,
    maxLength: number = 80,
  ): string {
    if (transcript.length <= maxLength) return transcript;
    return transcript.substring(0, maxLength).trim() + "...";
  }

  /**
   * Returns the username from metadata for display in the UI.
   * Falls back to video type if metadata is not available.
   *
   * @param url Instagram video URL.
   * @param metadata Optional metadata object containing username information.
   */
  function getVideoType(url: string, metadata?: VideoMetadata): string {
    // Prioritize username from metadata
    if (metadata?.username) {
      return `${metadata.username.replace(/^@/, "")}`;
    }
    if (metadata?.title) {
      const title = metadata.title.replace(/^@/, "");
      return `${title}`;
    }

    // Fallback to video type if no metadata
    if (url.includes("/reel/")) return "Reel";
    if (url.includes("/tv/")) return "IGTV";
    if (url.includes("/p/")) return "Post";
    return "Video";
  }

  const isValidUrl =
    searchText.trim() && validateInstagramUrl(searchText.trim());
  const urlInHistory = isValidUrl
    ? filteredHistory.some(
        (item) =>
          item.url === searchText.trim() ||
          extractVideoId(item.url) === extractVideoId(searchText.trim()),
      )
    : false;

  return (
    <List
      isLoading={isProcessing || isLoadingHistory}
      searchBarPlaceholder="Paste Instagram URL or search transcriptions..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      actions={
        <ActionPanel>
          {isValidUrl && (
            <Action
              title="Transcribe URL"
              icon={Icon.Video}
              shortcut={{ modifiers: [], key: "return" }}
              onAction={() => handleSearchSubmit()}
            />
          )}
        </ActionPanel>
      }
    >
      {isValidUrl && !urlInHistory && (
        <List.Item
          icon={Icon.Video}
          title={`Transcribe: ${extractVideoId(searchText.trim())}`}
          subtitle={searchText.trim()}
          actions={
            <ActionPanel>
              <Action
                title="Transcribe URL"
                icon={Icon.Video}
                shortcut={{ modifiers: [], key: "return" }}
                onAction={() => handleSearchSubmit()}
              />
            </ActionPanel>
          }
        />
      )}
      {filteredHistory.length === 0 && !isValidUrl && !isLoadingHistory ? (
        <List.EmptyView
          icon={Icon.Video}
          title={
            searchText.trim() ? "No matches found" : "No transcriptions yet"
          }
          description={
            searchText.trim()
              ? "Try a different search term"
              : "Paste an Instagram URL above to get started"
          }
        />
      ) : (
        filteredHistory.map((item) => (
          <List.Item
            key={item.id}
            icon={Icon.Document}
            title={truncateTranscript(item.transcript)}
            subtitle={getVideoType(item.url, item.metadata)}
            accessories={[{ text: formatDate(item.timestamp) }]}
            actions={
              <ActionPanel>
                <Action
                  title="View Transcript"
                  icon={Icon.Eye}
                  onAction={() =>
                    push(
                      <TranscriptView
                        transcript={item.transcript}
                        url={item.url}
                        metadata={item.metadata}
                        currentItemId={item.id}
                      />,
                    )
                  }
                />
                <Action.OpenInBrowser
                  title="Open Video"
                  url={item.url}
                  icon={Icon.Link}
                />
                <Action.CopyToClipboard
                  title="Copy Transcript"
                  content={item.transcript}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function TranscriptView({
  transcript,
  url,
  metadata,
  currentItemId,
}: {
  transcript: string;
  url: string;
  metadata?: VideoMetadata;
  currentItemId?: string;
}) {
  const { push, pop } = useNavigation();
  const [history, setHistory] = React.useState<TranscriptHistoryItem[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState<number>(-1);

  React.useEffect(() => {
    loadHistoryForNavigation();
  }, []);

  async function loadHistoryForNavigation() {
    try {
      const items = await getHistory();
      setHistory(items);

      // Find current item index in history
      if (currentItemId) {
        const index = items.findIndex((item) => item.id === currentItemId);
        setCurrentIndex(index >= 0 ? index : -1);
      } else {
        // Try to find by URL if no ID provided
        const index = items.findIndex((item) => item.url === url);
        setCurrentIndex(index >= 0 ? index : -1);
      }
    } catch (error) {
      console.error("Failed to load history for navigation:", error);
      setHistory([]);
    }
  }

  function navigateToAdjacent(offset: number) {
    if (currentIndex < 0 || history.length === 0) return;

    const newIndex = currentIndex + offset;
    if (newIndex < 0 || newIndex >= history.length) return;

    const item = history[newIndex];
    // Replace current view instead of pushing to keep stack flat
    // This allows Escape to go back to root in one pop
    pop();
    push(
      <TranscriptView
        transcript={item.transcript}
        url={item.url}
        metadata={item.metadata}
        currentItemId={item.id}
      />,
    );
  }

  // Include thumbnail at bottom if available, 300px tall (left-aligned using HTML img for explicit sizing)
  const thumbnailMarkdown = metadata?.thumbnail
    ? `\n\n---\n\n<img src="${metadata.thumbnail}" alt="Video thumbnail" style="height:300px;" />`
    : "";

  // Clean markdown with transcript at top and thumbnail below
  const markdown = `# Transcript

${transcript}${thumbnailMarkdown}

---

*Generated ${new Date().toLocaleString()}*

**Source:** [${url}](${url})`;

  // Build full markdown for copying (includes metadata)
  const fullMarkdown = metadata
    ? `# Video Transcript

${metadata.username ? `**@${metadata.username}**\n` : ""}${metadata.title ? `**${metadata.title}**\n\n` : ""}${metadata.description && metadata.description !== metadata.title ? `${metadata.description}\n\n---\n\n` : ""}${transcript}

---

*Generated ${new Date().toLocaleString()}*

**Source:** [${url}](${url})`
    : markdown;

  return (
    <Detail
      markdown={markdown}
      metadata={
        metadata && Object.keys(metadata).length > 0 ? (
          <Detail.Metadata>
            {metadata.username && (
              <Detail.Metadata.Label
                title="Video By"
                text={`${metadata.username}`}
              />
            )}
            {metadata.fullName && metadata.fullName !== metadata.username && (
              <Detail.Metadata.Label title="Name" text={metadata.fullName} />
            )}
            {metadata.title && (
              <Detail.Metadata.Label title="Username" text={metadata.title} />
            )}
            {metadata.description &&
              metadata.description !== metadata.title && (
                <Detail.Metadata.Label
                  title="Caption"
                  text={metadata.description}
                />
              )}
            {metadata.duration && (
              <Detail.Metadata.Label
                title="Duration"
                text={`${Math.floor(metadata.duration / 60)}:${String(Math.floor(metadata.duration % 60)).padStart(2, "0")}`}
              />
            )}
            {metadata.viewCount !== undefined && (
              <Detail.Metadata.Label
                title="Views"
                text={metadata.viewCount.toLocaleString()}
              />
            )}
            {metadata.likeCount !== undefined && (
              <Detail.Metadata.Label
                title="Likes"
                text={metadata.likeCount.toLocaleString()}
              />
            )}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title="Copy & Close"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: [], key: "return" }}
            onAction={async () => {
              await Clipboard.copy(transcript);
              await closeMainWindow();
            }}
          />
          {currentIndex > 0 && (
            <Action
              title="Previous Transcript"
              icon={Icon.ChevronLeft}
              shortcut={{ modifiers: [], key: "arrowLeft" }}
              onAction={() => navigateToAdjacent(-1)}
            />
          )}
          {currentIndex >= 0 && currentIndex < history.length - 1 && (
            <Action
              title="Next Transcript"
              icon={Icon.ChevronRight}
              shortcut={{ modifiers: [], key: "arrowRight" }}
              onAction={() => navigateToAdjacent(1)}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Transcript"
            content={transcript}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          {metadata?.description && metadata.description !== metadata.title && (
            <Action.CopyToClipboard
              title="Copy Caption"
              content={metadata.description}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
          )}
          <Action.CopyToClipboard
            title="Copy as Markdown"
            content={fullMarkdown}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          {metadata?.thumbnail && (
            <Action.OpenInBrowser
              title="View Thumbnail"
              url={metadata.thumbnail}
              icon={Icon.Image}
            />
          )}
          <Action.OpenInBrowser title="Open Video" url={url} icon={Icon.Link} />
          <Action
            title="View History"
            icon={Icon.Clock}
            shortcut={{ modifiers: ["cmd"], key: "h" }}
            onAction={() => push(<HistoryView />)}
          />
        </ActionPanel>
      }
    />
  );
}

function validateInstagramUrl(url: string): boolean {
  const patterns = [
    /^https?:\/\/(www\.)?instagram\.com\/p\/[\w-]+\/?/,
    /^https?:\/\/(www\.)?instagram\.com\/reel\/[\w-]+\/?/,
    /^https?:\/\/(www\.)?instagram\.com\/tv\/[\w-]+\/?/,
    /^https?:\/\/(www\.)?instagram\.com\/reels?\/[\w-]+\/?/,
  ];

  return patterns.some((pattern) => pattern.test(url));
}

function extractVideoId(url: string): string {
  const match = url.match(/\/(p|reel|tv|reels?)\/([\w-]+)/);
  return match ? match[2] : "";
}

type ProgressCallback = (progress: {
  title: string;
  message: string;
}) => Promise<void> | void;

async function transcribeVideo(
  url: string,
  preferences: Preferences,
  onProgress?: ProgressCallback,
): Promise<{ transcript: string; metadata: VideoMetadata }> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ig-transcribe-"));
  let videoPath: string | null = null;

  try {
    // Extract metadata first (before downloading video)
    await onProgress?.({
      title: "Fetching video info...",
      message: "Extracting metadata from Instagram",
    });
    const metadata = await extractMetadata(url);

    // Download video
    await onProgress?.({
      title: "Downloading video...",
      message: "Fetching video from Instagram",
    });
    videoPath = await downloadVideo(url, tempDir, onProgress);

    // Use Whisper API for transcription
    if (!preferences.whisperApiKey) {
      throw new Error("OpenAI API key required. Please add it in preferences.");
    }

    const transcript = await transcribeWithWhisper(
      videoPath,
      preferences.whisperApiKey,
      onProgress,
    );

    // Explicitly delete video file after successful transcription
    if (videoPath) {
      try {
        await fs.unlink(videoPath);
      } catch (error) {
        console.warn("Failed to delete video file:", error);
      }
    }

    await onProgress?.({
      title: "Cleaning up...",
      message: "Removing temporary files",
    });

    return { transcript, metadata };
  } finally {
    // Cleanup entire temp directory
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function findYtDlp(): Promise<string> {
  // Common Homebrew paths (Apple Silicon and Intel)
  const possiblePaths = [
    "/opt/homebrew/bin/yt-dlp", // Apple Silicon (M1/M2/M3)
    "/usr/local/bin/yt-dlp", // Intel Mac
  ];

  // First check common paths
  for (const ytDlpPath of possiblePaths) {
    try {
      await fs.access(ytDlpPath);
      return ytDlpPath;
    } catch {
      continue;
    }
  }

  // Fallback to checking PATH
  try {
    const { stdout } = await execAsync("which yt-dlp");
    const pathFromWhich = stdout.trim();
    if (pathFromWhich) {
      return pathFromWhich;
    }
  } catch {
    // which command failed, continue
  }

  throw new Error(
    "yt-dlp not found. Please install it via Homebrew: brew install yt-dlp",
  );
}

async function extractMetadata(url: string): Promise<VideoMetadata> {
  const ytDlpPath = await findYtDlp();
  const command = `"${ytDlpPath}" --dump-json --no-playlist --quiet --no-warnings "${url}"`;

  try {
    const { stdout } = await execAsync(command, { timeout: 30000 });
    const metadata = JSON.parse(stdout);

    // Extract best thumbnail (prefer highest quality)
    let thumbnail: string | undefined;
    if (metadata.thumbnail) {
      thumbnail = metadata.thumbnail;
    } else if (metadata.thumbnails && Array.isArray(metadata.thumbnails)) {
      // Find the highest resolution thumbnail
      const sortedThumbnails = metadata.thumbnails
        .filter((t: { url?: string }) => t.url)
        .sort(
          (a: { width?: number }, b: { width?: number }) =>
            (b.width || 0) - (a.width || 0),
        );
      thumbnail = sortedThumbnails[0]?.url;
    }

    // Extract title - if it contains "Video by @username", extract just the @username part
    let cleanTitle =
      metadata.title || metadata.description?.split("\n")[0] || undefined;
    if (cleanTitle) {
      // Match pattern like "Video by @username" and extract just "@username"
      const videoByMatch = cleanTitle.match(/Video by\s+(@?[\w.]+)/i);
      if (videoByMatch && videoByMatch[1]) {
        const username = videoByMatch[1];
        // Ensure it has @ prefix
        cleanTitle = username.startsWith("@") ? username : `@${username}`;
      } else {
        // If not in "Video by @username" format, just use the title as-is (it might be the actual caption)
        cleanTitle = cleanTitle.trim();
      }
    }

    return {
      username:
        metadata.uploader ||
        metadata.channel ||
        metadata.uploader_id ||
        undefined,
      fullName: metadata.uploader || metadata.uploader_id || undefined,
      thumbnail: thumbnail,
      title: cleanTitle,
      description: metadata.description || undefined,
      duration: metadata.duration || undefined,
      viewCount: metadata.view_count || metadata.play_count || undefined,
      likeCount: metadata.like_count || undefined,
    };
  } catch (error) {
    console.warn("Failed to extract metadata:", error);
    // Return empty metadata if extraction fails - don't block the process
    return {};
  }
}

async function downloadVideo(
  url: string,
  outputDir: string,
  onProgress?: ProgressCallback,
): Promise<string> {
  // Find yt-dlp executable
  await onProgress?.({
    title: "Preparing download...",
    message: "Locating yt-dlp",
  });
  const ytDlpPath = await findYtDlp();

  const outputPath = path.join(outputDir, "video.mp4");
  const command = `"${ytDlpPath}" -o "${outputPath}" --no-playlist --quiet --no-warnings "${url}"`;

  try {
    await onProgress?.({
      title: "Downloading video...",
      message: "This may take a moment depending on video size",
    });
    await execAsync(command, { timeout: 60000 });

    // Verify file exists
    await fs.access(outputPath);

    // Get file size for user feedback
    const stats = await fs.stat(outputPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    await onProgress?.({
      title: "Video downloaded",
      message: `Downloaded ${fileSizeMB} MB, preparing for transcription`,
    });

    return outputPath;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(
      `Failed to download video: ${errorMessage}. Make sure the URL is valid and the video is public.`,
    );
  }
}

async function findFfmpeg(): Promise<string> {
  // Common Homebrew paths (Apple Silicon and Intel)
  const possiblePaths = [
    "/opt/homebrew/bin/ffmpeg", // Apple Silicon (M1/M2/M3)
    "/usr/local/bin/ffmpeg", // Intel Mac
  ];

  // First check common paths
  for (const ffmpegPath of possiblePaths) {
    try {
      await fs.access(ffmpegPath);
      return ffmpegPath;
    } catch {
      continue;
    }
  }

  // Fallback to checking PATH
  try {
    const { stdout } = await execAsync("which ffmpeg");
    const pathFromWhich = stdout.trim();
    if (pathFromWhich) {
      return pathFromWhich;
    }
  } catch {
    // which command failed, continue
  }

  throw new Error(
    "ffmpeg not found. Please install it via Homebrew: brew install ffmpeg",
  );
}

async function transcribeWithWhisper(
  videoPath: string,
  apiKey: string,
  onProgress?: ProgressCallback,
): Promise<string> {
  // Find ffmpeg executable
  await onProgress?.({
    title: "Extracting audio...",
    message: "Preparing audio for transcription",
  });
  const ffmpegPath = await findFfmpeg();

  // Extract audio as MP3 (smaller file size for Whisper API)
  const audioPath = videoPath.replace(/\.[^.]+$/, ".mp3");
  try {
    await execAsync(
      `"${ffmpegPath}" -i "${videoPath}" -acodec libmp3lame -ab 128k -ar 44100 -ac 2 "${audioPath}" -y`,
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to extract audio: ${errorMessage}`);
  }

  // Verify audio file was created
  try {
    await fs.access(audioPath);
  } catch {
    throw new Error("Audio extraction failed - output file not found");
  }

  // Check file size (Whisper API has 25MB limit)
  const stats = await fs.stat(audioPath);
  const fileSizeMB = stats.size / (1024 * 1024);

  if (fileSizeMB > 25) {
    throw new Error(
      `Audio file too large (${fileSizeMB.toFixed(2)} MB). Whisper API limit is 25MB. Try a shorter video.`,
    );
  }

  await onProgress?.({
    title: "Audio extracted",
    message: `Uploading ${fileSizeMB.toFixed(2)} MB to Whisper API...`,
  });

  // Create form data for Whisper API
  const form = new FormData();
  form.append("file", createReadStream(audioPath));
  form.append("model", "whisper-1");
  form.append("response_format", "text");

  await onProgress?.({
    title: "Transcribing with Whisper...",
    message:
      "Processing audio with OpenAI Whisper API (this may take a minute)",
  });

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/audio/transcriptions",
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${apiKey}`,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 300000, // 5 minute timeout for long videos
      },
    );

    await onProgress?.({
      title: "Transcription complete",
      message: "Finalizing transcript...",
    });

    const transcript = response.data;

    if (
      !transcript ||
      typeof transcript !== "string" ||
      transcript.trim().length === 0
    ) {
      throw new Error(
        "Whisper API returned empty transcript. The audio may not contain speech.",
      );
    }

    return transcript.trim();
  } catch (error) {
    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 401) {
        throw new Error(
          "Invalid OpenAI API key. Please check your API key in preferences.",
        );
      } else if (axiosError.response?.status === 413) {
        throw new Error(
          "Audio file too large for Whisper API (max 25MB). Try a shorter video.",
        );
      } else if (axiosError.response?.status === 429) {
        throw new Error(
          "Whisper API rate limit exceeded. Please try again later.",
        );
      }
    }

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ECONNABORTED"
    ) {
      throw new Error(
        "Request timed out. The video may be too long. Please try again.",
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Whisper API error: ${errorMessage}`);
  }
}

// History management functions
async function addToHistory(
  url: string,
  transcript: string,
  videoId: string,
  metadata?: VideoMetadata,
): Promise<void> {
  const history = await getHistory();
  const newItem: TranscriptHistoryItem = {
    id: `${videoId}-${Date.now()}`,
    url,
    transcript,
    timestamp: Date.now(),
    videoId,
    metadata,
  };

  // Add to beginning of array (newest first)
  history.unshift(newItem);

  // Limit to last 100 items
  const limitedHistory = history.slice(0, 100);

  await LocalStorage.setItem(
    HISTORY_STORAGE_KEY,
    JSON.stringify(limitedHistory),
  );
}

async function getHistory(): Promise<TranscriptHistoryItem[]> {
  try {
    const historyJson = await LocalStorage.getItem(HISTORY_STORAGE_KEY);
    if (!historyJson || typeof historyJson !== "string") {
      return [];
    }
    return JSON.parse(historyJson) as TranscriptHistoryItem[];
  } catch {
    return [];
  }
}

async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_STORAGE_KEY);
}

async function deleteHistoryItem(id: string): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter((item) => item.id !== id);
  await LocalStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filtered));
}

// History View Component
function HistoryView() {
  const { push } = useNavigation();
  const [history, setHistory] = React.useState<TranscriptHistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = React.useState<
    TranscriptHistoryItem[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchText, setSearchText] = React.useState("");

  React.useEffect(() => {
    loadHistory();
  }, []);

  React.useEffect(() => {
    if (searchText.trim() === "") {
      setFilteredHistory(history);
    } else {
      const searchLower = searchText.toLowerCase();
      const filtered = history.filter(
        (item) =>
          item.transcript.toLowerCase().includes(searchLower) ||
          item.url.toLowerCase().includes(searchLower) ||
          item.videoId.toLowerCase().includes(searchLower),
      );
      setFilteredHistory(filtered);
    }
  }, [searchText, history]);

  async function loadHistory() {
    setIsLoading(true);
    try {
      const items = await getHistory();
      setHistory(items);
      setFilteredHistory(items);
    } catch (error) {
      console.error("Failed to load history:", error);
      setHistory([]);
      setFilteredHistory([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteHistoryItem(id);
    await loadHistory();
    await showToast({
      style: Toast.Style.Success,
      title: "Deleted",
      message: "Transcript removed from history",
    });
  }

  async function handleClearAll() {
    await clearHistory();
    setHistory([]);
    setFilteredHistory([]);
    await showToast({
      style: Toast.Style.Success,
      title: "History cleared",
      message: "All transcripts removed from history",
    });
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  function truncateTranscript(
    transcript: string,
    maxLength: number = 100,
  ): string {
    if (transcript.length <= maxLength) return transcript;
    return transcript.substring(0, maxLength).trim() + "...";
  }

  function getVideoType(url: string): string {
    if (url.includes("/reel/")) return "Reel";
    if (url.includes("/tv/")) return "IGTV";
    if (url.includes("/p/")) return "Post";
    return "Video";
  }

  const displayHistory = searchText.trim() ? filteredHistory : history;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search transcript history..."
      onSearchTextChange={setSearchText}
      filtering={false}
      actions={
        <ActionPanel>
          <Action
            title="Clear All History"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={handleClearAll}
            shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
          />
        </ActionPanel>
      }
    >
      {displayHistory.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Clock}
          title={searchText ? "No matches found" : "No transcript history"}
          description={
            searchText
              ? "Try a different search term"
              : "Your transcribed videos will appear here"
          }
        />
      ) : (
        displayHistory.map((item) => (
          <List.Item
            key={item.id}
            icon={Icon.Video}
            title={getVideoType(item.url)}
            subtitle={truncateTranscript(item.transcript)}
            accessories={[
              { text: formatDate(item.timestamp), icon: Icon.Clock },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="View Transcript"
                  icon={Icon.Eye}
                  onAction={() =>
                    push(
                      <TranscriptView
                        transcript={item.transcript}
                        url={item.url}
                        metadata={item.metadata}
                        currentItemId={item.id}
                      />,
                    )
                  }
                />
                <Action.OpenInBrowser
                  title="Open Video in Instagram"
                  url={item.url}
                  icon={Icon.Link}
                />
                <Action.CopyToClipboard
                  title="Copy Transcript"
                  content={item.transcript}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={item.url}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action
                  title="Delete from History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(item.id)}
                  shortcut={{ modifiers: ["cmd"], key: "delete" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
