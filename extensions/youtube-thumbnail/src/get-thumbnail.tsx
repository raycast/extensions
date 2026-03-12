import {
  showToast,
  Toast,
  ActionPanel,
  Action,
  Clipboard,
  Color,
  Icon,
  Grid,
  List,
  LocalStorage,
  getPreferenceValues,
  environment,
} from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "fs";
import path from "path";
import os from "os";

interface ThumbnailVariant {
  key: string;
  label: string;
  fileName: string;
}

interface AvailableThumbnail {
  key: string;
  label: string;
  url: string;
}

interface HistoryEntry {
  url: string;
  videoId: string;
  title: string;
}

type SelectedView = "thumbnails" | "history";

const ICON_TINT_COLOR = "#FF0033";
const URL_HISTORY_STORAGE_KEY = "youtube-url-history";
const MAX_HISTORY_ITEMS = 20;

const THUMBNAIL_VARIANTS: ThumbnailVariant[] = [
  { key: "maxres", label: "Max Resolution", fileName: "maxresdefault.jpg" },
  { key: "sd", label: "Standard Definition", fileName: "sddefault.jpg" },
  { key: "hq", label: "High Quality", fileName: "hqdefault.jpg" },
  { key: "mq", label: "Medium Quality", fileName: "mqdefault.jpg" },
  { key: "default", label: "Default", fileName: "default.jpg" },
];

export default function Command() {
  const [selectedView, setSelectedView] = useState<SelectedView>("thumbnails");
  const [urlInput, setUrlInput] = useState<string>("");
  const [historySearchText, setHistorySearchText] = useState<string>("");
  const normalizedUrl = normalizeInput(urlInput);
  const videoId = normalizedUrl ? extractVideoId(normalizedUrl) : null;
  const [availableThumbnails, setAvailableThumbnails] = useState<AvailableThumbnail[]>([]);
  const [urlHistory, setUrlHistory] = useState<HistoryEntry[]>([]);
  const [historyThumbnailUrls, setHistoryThumbnailUrls] = useState<Record<string, string>>({});
  const [isHistoryLoaded, setIsHistoryLoaded] = useState<boolean>(false);
  const [isPrefillingUrl, setIsPrefillingUrl] = useState<boolean>(true);
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState<boolean>(false);
  const [downloadPathError, setDownloadPathError] = useState<string | null>(null);
  const preferences = getPreferenceValues();
  const downloadPath = expandHomeDirectory(preferences.downloadLocation);

  useEffect(() => {
    void prefillUrlFromClipboard();
  }, []);

  useEffect(() => {
    void loadUrlHistory();
  }, []);

  useEffect(() => {
    const error = validateDownloadPath(downloadPath);
    setDownloadPathError(error);
    if (error) {
      showToast(Toast.Style.Failure, "Invalid Download Location", error);
    }
  }, [downloadPath]);

  useEffect(() => {
    let cancelled = false;

    async function runThumbnailsLookup() {
      if (!videoId) {
        setAvailableThumbnails([]);
        setIsLoadingThumbnails(false);
        return;
      }

      setAvailableThumbnails([]);
      setIsLoadingThumbnails(true);
      const foundThumbnails = await findAvailableThumbnails(videoId);
      if (cancelled) return;

      setAvailableThumbnails(foundThumbnails);
      setIsLoadingThumbnails(false);

      if (foundThumbnails.length === 0) {
        showToast(Toast.Style.Failure, "Thumbnail Not Found", "No thumbnail image is available for this video");
      }
    }

    void runThumbnailsLookup();

    return () => {
      cancelled = true;
    };
  }, [videoId]);

  const currentVideoThumbnailUrl = videoId
    ? (availableThumbnails.find((thumbnail) => thumbnail.url.includes(`/vi/${videoId}/`))?.url ?? null)
    : null;

  useEffect(() => {
    if (!isHistoryLoaded || !videoId || !currentVideoThumbnailUrl) {
      return;
    }

    void saveUrlToHistory(videoId, currentVideoThumbnailUrl);
  }, [currentVideoThumbnailUrl, isHistoryLoaded, videoId]);

  useEffect(() => {
    let cancelled = false;

    async function loadHistoryThumbnails() {
      if (urlHistory.length === 0) {
        setHistoryThumbnailUrls({});
        return;
      }

      const missingEntries = urlHistory.filter((entry) => !historyThumbnailUrls[entry.url]);
      if (missingEntries.length === 0) {
        return;
      }

      const entries = await Promise.all(
        missingEntries.map(async (entry) => {
          const largestThumbnailUrl = await findLargestThumbnailUrl(entry.videoId);
          return [entry.url, largestThumbnailUrl ?? ""] as const;
        }),
      );

      if (cancelled) {
        return;
      }

      setHistoryThumbnailUrls((currentUrls) => ({
        ...currentUrls,
        ...Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => entry[1].length > 0)),
      }));
    }

    void loadHistoryThumbnails();

    return () => {
      cancelled = true;
    };
  }, [historyThumbnailUrls, urlHistory]);

  async function findAvailableThumbnails(id: string): Promise<AvailableThumbnail[]> {
    const results = await Promise.all(
      THUMBNAIL_VARIANTS.map(async (variant) => {
        const resolvedUrl = await findThumbnailForVariant(id, variant.fileName);
        if (!resolvedUrl) return null;
        return {
          key: variant.key,
          label: variant.label,
          url: resolvedUrl,
        } satisfies AvailableThumbnail;
      }),
    );

    return results.filter((thumbnail): thumbnail is AvailableThumbnail => thumbnail !== null);
  }

  async function findLargestThumbnailUrl(id: string): Promise<string | null> {
    for (const variant of THUMBNAIL_VARIANTS) {
      const resolvedUrl = await findThumbnailForVariant(id, variant.fileName);
      if (resolvedUrl) {
        return resolvedUrl;
      }
    }

    return null;
  }

  async function fetchVideoTitle(id: string): Promise<string | null> {
    try {
      const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`;
      const response = await fetch(oEmbedUrl);
      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as { title?: unknown };
      return typeof data.title === "string" && data.title.trim().length > 0 ? data.title.trim() : null;
    } catch {
      return null;
    }
  }

  async function findThumbnailForVariant(id: string, fileName: string): Promise<string | null> {
    const candidates = [`https://i.ytimg.com/vi/${id}/${fileName}`, `https://img.youtube.com/vi/${id}/${fileName}`];

    for (const candidate of candidates) {
      try {
        const response = await fetch(candidate, { method: "HEAD" });
        if (response.ok) {
          return candidate;
        }
      } catch {
        // Try the next candidate URL.
      }
    }

    return null;
  }

  async function prefillUrlFromClipboard() {
    const clipboardUrl = await readClipboardText();
    if (clipboardUrl) {
      setUrlInput(clipboardUrl);
    }
    setIsPrefillingUrl(false);
  }

  async function pasteUrlFromClipboard() {
    const clipboardUrl = await readClipboardText();
    if (!clipboardUrl) {
      return;
    }

    setUrlInput(clipboardUrl);
    setSelectedView("thumbnails");
  }

  async function readClipboardText(): Promise<string | null> {
    try {
      return normalizeInput(await Clipboard.readText());
    } catch {
      return null;
    }
  }

  async function downloadImage(thumbnail: AvailableThumbnail) {
    if (!videoId) {
      return;
    }

    if (downloadPathError) {
      showToast(Toast.Style.Failure, "Invalid Download Location", downloadPathError);
      return;
    }

    try {
      const response = await fetch(thumbnail.url);
      if (!response.ok) {
        showToast(Toast.Style.Failure, "Download Failed", "Thumbnail URL is not accessible");
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileName = path.join(downloadPath, `${videoId}-${thumbnail.key}.jpg`);

      await fs.promises.mkdir(downloadPath, { recursive: true });
      await fs.promises.writeFile(fileName, buffer);
      showToast(Toast.Style.Success, "Thumbnail Downloaded", `Saved to ${downloadPath}`);
    } catch (error) {
      if (error instanceof Error) {
        showToast(Toast.Style.Failure, "Download Failed", error.message);
      } else {
        showToast(Toast.Style.Failure, "Download Failed", "Unable to save the thumbnail file");
      }
    }
  }

  async function copyImageUrl(url: string) {
    await Clipboard.copy(url);
    showToast(Toast.Style.Success, "Thumbnail URL Copied", url);
  }

  async function loadUrlHistory() {
    try {
      const storedHistory = await LocalStorage.getItem<string>(URL_HISTORY_STORAGE_KEY);
      if (!storedHistory) {
        setUrlHistory([]);
        setIsHistoryLoaded(true);
        return;
      }

      const parsedHistory = JSON.parse(storedHistory);
      if (!Array.isArray(parsedHistory)) {
        setUrlHistory([]);
        setIsHistoryLoaded(true);
        return;
      }

      const validHistory = parsedHistory
        .map((entry) => normalizeHistoryEntry(entry))
        .filter((entry): entry is HistoryEntry => entry !== null);
      setUrlHistory(validHistory);
      setIsHistoryLoaded(true);
    } catch {
      setUrlHistory([]);
      setIsHistoryLoaded(true);
    }
  }

  async function saveUrlToHistory(id: string, thumbnailUrl: string) {
    const canonicalUrl = `https://www.youtube.com/watch?v=${id}`;
    const title = await fetchVideoTitle(id);
    const nextEntry: HistoryEntry = {
      url: canonicalUrl,
      videoId: id,
      title: title ?? canonicalUrl,
    };
    const nextHistory = [nextEntry, ...urlHistory.filter((entry) => entry.videoId !== id)].slice(0, MAX_HISTORY_ITEMS);

    setHistoryThumbnailUrls((currentUrls) => ({
      ...currentUrls,
      [canonicalUrl]: thumbnailUrl,
    }));
    setUrlHistory(nextHistory);
    await LocalStorage.setItem(URL_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
  }

  async function clearUrlHistory() {
    setUrlHistory([]);
    await LocalStorage.removeItem(URL_HISTORY_STORAGE_KEY);
    showToast(Toast.Style.Success, "History Cleared");
  }

  async function removeHistoryEntry(videoId: string) {
    const nextHistory = urlHistory.filter((entry) => entry.videoId !== videoId);
    setUrlHistory(nextHistory);

    if (nextHistory.length === 0) {
      await LocalStorage.removeItem(URL_HISTORY_STORAGE_KEY);
    } else {
      await LocalStorage.setItem(URL_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
    }

    showToast(Toast.Style.Success, "Removed From History");
  }

  function openHistoryEntry(url: string) {
    setUrlInput(url);
    setSelectedView("thumbnails");
  }

  const filteredHistory = urlHistory.filter((url) => {
    const query = historySearchText.trim().toLowerCase();
    return query.length === 0 || url.title.toLowerCase().includes(query) || url.url.toLowerCase().includes(query);
  });

  const listViewDropdown = (
    <List.Dropdown tooltip="View" value={selectedView} onChange={(value) => setSelectedView(value as SelectedView)}>
      <List.Dropdown.Item
        title="Thumbnails"
        value="thumbnails"
        icon={{ source: Icon.Image, tintColor: Color.SecondaryText }}
      />
      <List.Dropdown.Item
        title="History"
        value="history"
        icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
      />
    </List.Dropdown>
  );

  const gridViewDropdown = (
    <Grid.Dropdown tooltip="View" value={selectedView} onChange={(value) => setSelectedView(value as SelectedView)}>
      <Grid.Dropdown.Item
        title="Thumbnails"
        value="thumbnails"
        icon={{ source: Icon.Image, tintColor: Color.SecondaryText }}
      />
      <Grid.Dropdown.Item
        title="History"
        value="history"
        icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
      />
    </Grid.Dropdown>
  );

  if (selectedView === "history") {
    return (
      <Grid
        searchBarAccessory={gridViewDropdown}
        searchText={historySearchText}
        onSearchTextChange={setHistorySearchText}
        searchBarPlaceholder="Filter previous YouTube URLs..."
        columns={3}
        inset={Grid.Inset.Zero}
        fit={Grid.Fit.Fill}
        aspectRatio="16/9"
      >
        {filteredHistory.length === 0 ? (
          <Grid.EmptyView
            title="No History"
            description="Valid YouTube URLs you open will appear in this list."
            icon={{
              source: path.join(environment.assetsPath, "icons", "history-off.svg"),
              tintColor: ICON_TINT_COLOR,
            }}
            actions={
              <ActionPanel>
                <Action
                  title="Switch to Thumbnails"
                  onAction={() => setSelectedView("thumbnails")}
                  icon={Icon.AppWindow}
                />
                {urlHistory.length > 0 ? (
                  <Action
                    title="Clear History"
                    onAction={clearUrlHistory}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                  />
                ) : null}
              </ActionPanel>
            }
          />
        ) : (
          filteredHistory.map((entry) => (
            <Grid.Item
              key={entry.videoId}
              title={entry.title}
              content={historyThumbnailUrls[entry.url] ? { source: historyThumbnailUrls[entry.url] } : Icon.Clock}
              actions={
                <ActionPanel>
                  <Action title="Open Thumbnails" onAction={() => openHistoryEntry(entry.url)} icon={Icon.AppWindow} />
                  <Action title="Copy URL" onAction={() => Clipboard.copy(entry.url)} icon={Icon.CopyClipboard} />
                  <Action
                    title="Remove from History"
                    onAction={() => removeHistoryEntry(entry.videoId)}
                    icon={Icon.MinusCircle}
                    style={Action.Style.Destructive}
                  />
                  <Action
                    title="Clear All History"
                    onAction={clearUrlHistory}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                  />
                </ActionPanel>
              }
            />
          ))
        )}
      </Grid>
    );
  }

  if (!videoId || availableThumbnails.length === 0) {
    const statusMarkdown = getStatusMarkdown({
      isPrefillingUrl,
      normalizedUrl,
      videoId,
      isLoadingThumbnails,
      downloadPathError,
    });
    const placeholder = getPlaceholderEmptyState({ isPrefillingUrl, normalizedUrl, videoId });

    return (
      <List
        isShowingDetail={true}
        isLoading={isPrefillingUrl || isLoadingThumbnails}
        searchBarAccessory={listViewDropdown}
        searchText={urlInput}
        onSearchTextChange={setUrlInput}
        searchBarPlaceholder="Paste a YouTube URL..."
      >
        {placeholder ? (
          <List.EmptyView
            title={placeholder.title}
            description={placeholder.description}
            icon={getInvalidStatusIcon()}
            actions={
              <ActionPanel>
                <Action
                  title="Paste URL from Clipboard"
                  onAction={pasteUrlFromClipboard}
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "v" }}
                />
              </ActionPanel>
            }
          />
        ) : (
          <List.Item
            title="YouTube Thumbnail"
            detail={<List.Item.Detail markdown={statusMarkdown} />}
            actions={
              <ActionPanel>
                <Action
                  title="Paste URL from Clipboard"
                  onAction={pasteUrlFromClipboard}
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "v" }}
                />
              </ActionPanel>
            }
          />
        )}
      </List>
    );
  }

  return (
    <List
      isShowingDetail={true}
      isLoading={isPrefillingUrl || isLoadingThumbnails}
      searchBarAccessory={listViewDropdown}
      searchText={urlInput}
      onSearchTextChange={setUrlInput}
      searchBarPlaceholder="Paste a YouTube URL..."
    >
      {availableThumbnails.map((thumbnail) => (
        <List.Item
          key={`${videoId}-${thumbnail.key}`}
          title={thumbnail.label}
          icon={getThumbnailVariantIcon(thumbnail.key)}
          accessories={[
            {
              text: {
                value: getThumbnailDimensions(thumbnail.key),
                color: Color.SecondaryText,
              },
            },
          ]}
          detail={<List.Item.Detail markdown={`![${thumbnail.label}](${thumbnail.url})`} />}
          actions={
            <ActionPanel>
              <Action title="Download Thumbnail" onAction={() => downloadImage(thumbnail)} icon={Icon.Download} />
              <Action title="Copy Thumbnail URL" onAction={() => copyImageUrl(thumbnail.url)} icon={Icon.Link} />
              <Action
                title="Paste URL from Clipboard"
                onAction={pasteUrlFromClipboard}
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd"], key: "v" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function getThumbnailVariantIcon(variantKey: string) {
  const iconMap: Record<string, string> = {
    maxres: "max.svg",
    sd: "standard.svg",
    hq: "high.svg",
    mq: "medium.svg",
    default: "default.svg",
  };

  const fileName = iconMap[variantKey] ?? "default.svg";
  const source = path.join(environment.assetsPath, "icons", fileName);
  return {
    source,
    tintColor: ICON_TINT_COLOR,
  };
}

function getThumbnailDimensions(variantKey: string) {
  const dimensionMap: Record<string, string> = {
    maxres: "1280 × 720",
    sd: "640 × 480",
    hq: "480 × 360",
    mq: "320 × 180",
    default: "120 × 90",
  };

  return dimensionMap[variantKey] ?? "Unknown size";
}

function getStatusMarkdown(params: {
  isPrefillingUrl: boolean;
  normalizedUrl: string | null;
  videoId: string | null;
  isLoadingThumbnails: boolean;
  downloadPathError: string | null;
}): string {
  const { isPrefillingUrl, normalizedUrl, videoId, isLoadingThumbnails, downloadPathError } = params;

  if (isPrefillingUrl) {
    return "Loading URL from clipboard...";
  }

  if (!normalizedUrl) {
    return `## No URL found  
Paste a valid YouTube URL above.`;
  }

  if (!videoId) {
    return `## Invalid YouTube URL  
Paste a valid YouTube URL above.`;
  }

  if (downloadPathError) {
    return `## Invalid Download Location  
${downloadPathError}`;
  }

  if (isLoadingThumbnails) {
    return "Loading thumbnails...";
  }

  return `## Thumbnail Not Found  
This video may not have a public thumbnail image available.`;
}

function getPlaceholderEmptyState(params: {
  isPrefillingUrl: boolean;
  normalizedUrl: string | null;
  videoId: string | null;
}): { title: string; description: string } | null {
  const { isPrefillingUrl, normalizedUrl, videoId } = params;

  if (isPrefillingUrl) {
    return null;
  }

  if (!normalizedUrl) {
    return { title: "No URL found", description: "Paste a valid YouTube URL above." };
  }

  if (!videoId) {
    return { title: "Invalid YouTube URL", description: "Paste a valid YouTube URL above." };
  }

  return null;
}

function getInvalidStatusIcon() {
  return {
    source: path.join(environment.assetsPath, "icons", "invalid.svg"),
    tintColor: ICON_TINT_COLOR,
  };
}

function normalizeInput(input?: string | null): string | null {
  if (typeof input !== "string") return null;
  const normalized = input.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeHistoryEntry(entry: unknown): HistoryEntry | null {
  if (typeof entry === "string") {
    const videoId = extractVideoId(entry);
    if (!videoId) {
      return null;
    }

    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
    return {
      url: canonicalUrl,
      videoId,
      title: canonicalUrl,
    };
  }

  if (typeof entry !== "object" || entry === null) {
    return null;
  }

  const candidate = entry as Partial<HistoryEntry>;
  const url = normalizeInput(candidate.url);
  const videoId = typeof candidate.videoId === "string" ? candidate.videoId : url ? extractVideoId(url) : null;
  const title = normalizeInput(candidate.title);

  if (!url || !videoId) {
    return null;
  }

  return {
    url: `https://www.youtube.com/watch?v=${videoId}`,
    videoId,
    title: title ?? `https://www.youtube.com/watch?v=${videoId}`,
  };
}

function extractVideoId(url: string): string | null {
  const regex = new RegExp(
    "(?:https?://)?(?:www\\.)?(?:youtube\\.com/(?:[^/\\n\\s]+/\\S+/|(?:v|e(?:mbed)?)/|shorts/|\\S*?[?&]v=)|youtu\\.be/)([a-zA-Z0-9_-]{11})",
  );
  const match = url.match(regex);
  return match ? match[1] : null;
}

function expandHomeDirectory(inputPath: string): string {
  if (inputPath === "~") {
    return os.homedir();
  }

  if (inputPath.startsWith("~/")) {
    return path.join(os.homedir(), inputPath.slice(2));
  }

  return inputPath;
}

function validateDownloadPath(downloadPath: string): string | null {
  if (!path.isAbsolute(downloadPath)) {
    return "Choose an absolute folder path in command preferences.";
  }

  try {
    const stats = fs.statSync(downloadPath);
    if (!stats.isDirectory()) {
      return "Selected path is not a folder.";
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return "Selected folder does not exist.";
    }
    return "Cannot access selected folder.";
  }

  try {
    fs.accessSync(downloadPath, fs.constants.W_OK);
  } catch {
    return "No write permission for selected folder.";
  }

  return null;
}
