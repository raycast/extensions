import axios from "axios";
import { Clipboard, open, showHUD, showToast, Toast } from "@raycast/api";
import { createWriteStream, existsSync } from "fs";

interface AbDownloaderInstagramMedia {
  status?: boolean;
  msg?: string;
  message?: string;
  thumbnail?: string;
  url?: string;
  resolution?: string;
  shouldRender?: boolean;
}

interface InstagramHighlightStory {
  img: string;
  url: string;
}

interface FollowmeterHighlightMedia {
  url?: string;
  type?: string;
  thumbnail?: string;
  poster?: string | null;
}

interface FollowmeterHighlightResponse {
  status?: string;
  media?: FollowmeterHighlightMedia[];
  message?: string;
  error?: string;
}

const AB_DOWNLOADER_INSTAGRAM_URL = "https://backend1.tioo.eu.org/igdl";
const AB_DOWNLOADER_USER_AGENT = "btch/1.0.2";
const FOLLOWMETER_HIGHLIGHT_DOWNLOADER_URL = "https://followmeter.app/highlight-downloader";
const FOLLOWMETER_STORY_DOWNLOADER_URL = "https://followmeter.app/story-downloader";
const FOLLOWMETER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";

// Toast `onAction` handlers must `await` their side effects, otherwise the
// runtime tears the no-view command down before the call reaches the OS.
export async function showErrorToast(title: string, message: string, openUrl?: string) {
  const copyAction: Toast.ActionOptions = {
    title: "Copy Error",
    onAction: async () => {
      await Clipboard.copy(`${title}: ${message}`);
      await showHUD("Copied error to clipboard");
    },
  };

  const openAction: Toast.ActionOptions | undefined = openUrl
    ? {
        title: "Open in Browser",
        onAction: async () => {
          await open(openUrl);
        },
      }
    : undefined;

  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
    primaryAction: openAction ?? copyAction,
    secondaryAction: openAction ? copyAction : undefined,
  });
}

export function mediaExtensionAndId(url: string): { ext: string; fileId: string | undefined } {
  const fileName = getFileNameFromUrl(url);
  const ext = getExtension(fileName) || getExtension(url) || "mp4";
  const fileId = fileName?.replace(/\.[^.]+$/, "") || url.split(/[/?#]/).filter(Boolean).pop();
  return { ext, fileId };
}

function getExtension(value?: string): string | undefined {
  const match = value?.match(/\.([a-z0-9]{2,5})(?:[/?#]|$)/i);
  return match?.[1].toLowerCase().replace("jpeg", "jpg");
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function getFileNameFromUrl(url: string): string | undefined {
  try {
    const parsedUrl = new URL(url);
    const token = parsedUrl.searchParams.get("token");

    if (token) {
      const payload = JSON.parse(decodeBase64Url(token.split(".")[1] || "")) as {
        filename?: string;
        url?: string;
      };

      if (payload.filename) return payload.filename;

      if (payload.url) {
        const sourceFileName = getFileNameFromUrl(payload.url);
        if (sourceFileName) return sourceFileName;
      }
    }

    const pathFileName = parsedUrl.pathname.split("/").filter(Boolean).pop();
    return pathFileName ? decodeURIComponent(pathFileName) : undefined;
  } catch {
    return undefined;
  }
}

async function fetchInstagramMediaWithAbDownloader(sourceUrl: string): Promise<string[]> {
  const response = await axios.get<AbDownloaderInstagramMedia[] | AbDownloaderInstagramMedia>(
    AB_DOWNLOADER_INSTAGRAM_URL,
    {
      params: { url: sourceUrl },
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": AB_DOWNLOADER_USER_AGENT,
      },
    },
  );

  const data = response.data;
  if (!Array.isArray(data)) {
    throw new Error(data.msg || data.message || "Unexpected response from ab-downloader.");
  }

  const mediaUrls = data
    .filter((item) => item.status !== false && typeof item.url === "string" && item.url.length > 0)
    .map((item) => item.url as string);

  if (mediaUrls.length === 0) {
    const errorItem = data.find((item) => item.msg || item.message);
    throw new Error(errorItem?.msg || errorItem?.message || "No media found from ab-downloader.");
  }

  return Array.from(new Set(mediaUrls));
}

type InstagramMediaType = "post" | "reel";

export async function getInstagramMediaURL(
  shortcode: string,
  progressToast?: Toast,
  sourceUrl?: string,
  mediaType: InstagramMediaType = "post",
) {
  try {
    if (progressToast) {
      progressToast.message = "Fetching via downloader API...";
    }
    const fallbackPath = mediaType === "reel" ? "reel" : "p";
    return await fetchInstagramMediaWithAbDownloader(
      sourceUrl || `https://www.instagram.com/${fallbackPath}/${shortcode}/`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await showErrorToast("Could not fetch Instagram media", message, sourceUrl);
    return null;
  }
}

async function fetchFollowmeterMedia(
  url: string,
  endpoint: string,
  fieldName: "input" | "url",
): Promise<FollowmeterHighlightMedia[]> {
  const response = await axios.post<FollowmeterHighlightResponse>(
    endpoint,
    { [fieldName]: url },
    {
      headers: {
        "Content-Type": "multipart/form-data",
        Origin: "https://followmeter.app",
        Referer: "https://followmeter.app/",
        "User-Agent": FOLLOWMETER_USER_AGENT,
      },
    },
  );

  if (response.data.status !== "success" || !Array.isArray(response.data.media)) {
    throw new Error(response.data.message || response.data.error || "Unexpected response from Followmeter.");
  }

  return response.data.media.filter((media) => typeof media.url === "string" && media.url.length > 0);
}

export async function getInstagramStoryURL(url: string): Promise<string[] | null> {
  try {
    const media = await fetchFollowmeterMedia(url, FOLLOWMETER_STORY_DOWNLOADER_URL, "url");
    return media.map((item) => item.url as string);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await showErrorToast("Could not fetch Instagram story", message);
    return null;
  }
}

export async function getInstagramHighlightStoryURL(url: string): Promise<InstagramHighlightStory[] | null> {
  try {
    const media = await fetchFollowmeterMedia(url, FOLLOWMETER_HIGHLIGHT_DOWNLOADER_URL, "input");
    return media.map((item) => ({
      img: item.thumbnail || item.poster || (item.url as string),
      url: item.url as string,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await showErrorToast("Could not fetch Instagram highlight story", message);
    return null;
  }
}

export async function handleDownload(mediaUrl: string, mediaId: string, downloadFolder: string, fileExtension: string) {
  let filePath = `${downloadFolder}/${mediaId.substring(0, 100)}.${fileExtension}`;
  let counter = 1;

  while (existsSync(filePath)) {
    filePath = `${downloadFolder}/${mediaId.substring(0, 100)}(${counter}).${fileExtension}`;
    counter++;
  }

  const writer = createWriteStream(filePath);

  const progressToast = await showToast({
    title: "Downloading Media",
    message: "0%",
    style: Toast.Style.Animated,
  });

  try {
    const response = await axios.get(mediaUrl, {
      responseType: "stream",
      onDownloadProgress: (event) => {
        if (event.total) {
          const progress = Math.round((event.loaded / event.total) * 100);
          progressToast.message = `${progress}%`;
        }
      },
    });

    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    await showToast({
      title: "Download Complete",
      message: `Media saved to ${filePath}`,
      style: Toast.Style.Success,
      primaryAction: {
        title: "Open in Finder",
        onAction: () => {
          open(filePath);
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    await showErrorToast("Error While Downloading Media", message);
  }
}
