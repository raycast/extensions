import {
  showToast,
  Toast,
  ActionPanel,
  Action,
  Clipboard,
  Icon,
  List,
  getPreferenceValues,
  environment,
} from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "fs";
import path from "path";
import os from "os";

interface Preferences {
  downloadLocation: string;
}

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

const ICON_TINT_COLOR = "#FF0033";

const THUMBNAIL_VARIANTS: ThumbnailVariant[] = [
  { key: "maxres", label: "Max Resolution", fileName: "maxresdefault.jpg" },
  { key: "sd", label: "Standard Definition", fileName: "sddefault.jpg" },
  { key: "hq", label: "High Quality", fileName: "hqdefault.jpg" },
  { key: "mq", label: "Medium Quality", fileName: "mqdefault.jpg" },
  { key: "default", label: "Default", fileName: "default.jpg" },
];

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const normalizedUrl = normalizeInput(searchText);
  const videoId = normalizedUrl ? extractVideoId(normalizedUrl) : null;
  const [availableThumbnails, setAvailableThumbnails] = useState<AvailableThumbnail[]>([]);
  const [quickLookPaths, setQuickLookPaths] = useState<Record<string, string>>({});
  const [isPrefillingUrl, setIsPrefillingUrl] = useState<boolean>(true);
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState<boolean>(false);
  const [downloadPathError, setDownloadPathError] = useState<string | null>(null);
  const preferences = getPreferenceValues<Preferences>();
  const downloadPath = expandHomeDirectory(preferences.downloadLocation);

  useEffect(() => {
    void prefillUrlFromClipboard();
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

  useEffect(() => {
    let cancelled = false;

    async function prepareQuickLookFiles() {
      if (!videoId || availableThumbnails.length === 0) {
        setQuickLookPaths({});
        return;
      }

      const entries = await Promise.all(
        availableThumbnails.map(async (thumbnail) => {
          try {
            const filePath = await getQuickLookFilePath(videoId, thumbnail);
            return [thumbnail.key, filePath] as const;
          } catch {
            return [thumbnail.key, ""] as const;
          }
        }),
      );

      if (cancelled) return;
      setQuickLookPaths(
        Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => entry[1].length > 0)),
      );
    }

    void prepareQuickLookFiles();

    return () => {
      cancelled = true;
    };
  }, [videoId, availableThumbnails]);

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
      setSearchText(clipboardUrl);
    }
    setIsPrefillingUrl(false);
  }

  async function pasteUrlFromClipboard() {
    const clipboardUrl = await readClipboardText();
    if (!clipboardUrl) {
      return;
    }

    setSearchText(clipboardUrl);
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

      fs.mkdirSync(downloadPath, { recursive: true });
      fs.writeFileSync(fileName, buffer);
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

  if (!videoId || availableThumbnails.length === 0) {
    const statusMarkdown = getStatusMarkdown({
      isPrefillingUrl,
      normalizedUrl,
      videoId,
      isLoadingThumbnails,
      downloadPathError,
    });
    const status = getStatusInfo({ isPrefillingUrl, normalizedUrl, videoId });

    return (
      <List
        isShowingDetail={true}
        isLoading={isPrefillingUrl || isLoadingThumbnails}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder="Paste a YouTube URL..."
      >
        <List.Item
          title={status.title}
          icon={status.showInvalidIcon ? getInvalidStatusIcon() : undefined}
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
      </List>
    );
  }

  return (
    <List
      isShowingDetail={true}
      isLoading={isPrefillingUrl || isLoadingThumbnails}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Paste a YouTube URL..."
    >
      {availableThumbnails.map((thumbnail) => (
        <List.Item
          key={thumbnail.key}
          title={thumbnail.label}
          icon={getThumbnailVariantIcon(thumbnail.key)}
          accessories={[{ icon: Icon.Link, tooltip: thumbnail.url }]}
          detail={<List.Item.Detail markdown={`![${thumbnail.label}](${thumbnail.url})`} />}
          quickLook={
            quickLookPaths[thumbnail.key]
              ? {
                  name: `${thumbnail.label}.jpg`,
                  path: quickLookPaths[thumbnail.key],
                }
              : undefined
          }
          actions={
            <ActionPanel>
              <Action title="Download Thumbnail" onAction={() => downloadImage(thumbnail)} icon={Icon.Download} />
              <Action title="Copy Thumbnail URL" onAction={() => copyImageUrl(thumbnail.url)} icon={Icon.Link} />
              {quickLookPaths[thumbnail.key] ? <Action.ToggleQuickLook /> : null}
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

async function getQuickLookFilePath(videoId: string, thumbnail: AvailableThumbnail): Promise<string> {
  const quickLookDir = path.join(environment.supportPath, "quicklook");
  fs.mkdirSync(quickLookDir, { recursive: true });

  const filePath = path.join(quickLookDir, `${videoId}-${thumbnail.key}.jpg`);
  if (isUsableImageFile(filePath)) {
    return filePath;
  }

  const response = await fetch(thumbnail.url);
  if (!response.ok) {
    throw new Error(`Failed to fetch thumbnail for quick look: ${thumbnail.url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length === 0) {
    throw new Error(`Empty thumbnail response for quick look: ${thumbnail.url}`);
  }

  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, buffer);
  fs.renameSync(tempPath, filePath);
  return filePath;
}

function isUsableImageFile(filePath: string): boolean {
  try {
    const stats = fs.statSync(filePath);
    return stats.isFile() && stats.size > 0;
  } catch {
    return false;
  }
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

  if (videoId) {
    return `## Thumbnail Not Found  
This video may not have a public thumbnail image available.`;
  }

  return "Enter a YouTube URL.";
}

function getStatusInfo(params: { isPrefillingUrl: boolean; normalizedUrl: string | null; videoId: string | null }): {
  title: string;
  showInvalidIcon: boolean;
} {
  const { isPrefillingUrl, normalizedUrl, videoId } = params;

  if (isPrefillingUrl) {
    return { title: "YouTube Thumbnail", showInvalidIcon: false };
  }

  if (!normalizedUrl) {
    return { title: "No URL found", showInvalidIcon: true };
  }

  if (!videoId) {
    return { title: "Invalid YouTube URL", showInvalidIcon: true };
  }

  return { title: "YouTube Thumbnail", showInvalidIcon: false };
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
