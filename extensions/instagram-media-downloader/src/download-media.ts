import axios from "axios";
import { Clipboard, open, showHUD, showToast, Toast } from "@raycast/api";
import { createWriteStream, existsSync } from "fs";
import * as cheerio from "cheerio";

interface InstagramMediaEdge {
  node: {
    video_url?: string;
    display_url: string;
  };
}

const GRAPHQL_DOC_ID = "8845758582119845";
const GRAPHQL_MAX_ATTEMPTS = 3;
const GRAPHQL_BASE_DELAY_MS = 1000;
const GRAPHQL_MAX_BACKOFF_MS = 2000;

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
  const ext = url.includes(".jpg") ? ".jpg" : ".mp4";
  return { ext, fileId: url.split(ext)[0].split("/").pop() };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Instagram throttles unauthenticated callers and intermittently returns 401
// or a 200 with `xdt_shortcode_media: null`. Both are recoverable with a
// short backoff — gallery posts are especially sensitive to this.
async function fetchInstagramMediaWithRetry(shortcode: string, progressToast?: Toast) {
  const params = new URLSearchParams({
    doc_id: GRAPHQL_DOC_ID,
    variables: JSON.stringify({ shortcode }),
  });

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    "X-Requested-With": "XMLHttpRequest",
    "X-Instagram-AJAX": "1",
    "X-IG-App-ID": "936619743392459",
    Referer: `https://www.instagram.com/p/${shortcode}/`,
    Origin: "https://www.instagram.com",
  };

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= GRAPHQL_MAX_ATTEMPTS; attempt++) {
    let response;
    try {
      response = await axios.get(`https://www.instagram.com/graphql/query?${params.toString()}`, {
        headers,
        validateStatus: (status) => status < 500,
      });
    } catch (error) {
      lastError = error;
    }

    if (response) {
      if (response.status === 200) {
        const media = response.data?.data?.xdt_shortcode_media;
        if (media) return media;
        lastError = new Error("Instagram returned an empty media response (likely rate-limited).");
      } else if (response.status === 401 || response.status === 429) {
        lastError = new Error(`Instagram rate-limit (status ${response.status}).`);
      } else if (response.status === 400 || response.status === 403 || response.status === 404) {
        // Post does not exist or is not accessible — don't waste retries.
        throw new Error(`Instagram returned status ${response.status} — post may be private or deleted.`);
      } else {
        lastError = new Error(`Unexpected status ${response.status} from Instagram.`);
      }
    }

    if (attempt < GRAPHQL_MAX_ATTEMPTS) {
      const backoff = Math.min(GRAPHQL_BASE_DELAY_MS * Math.pow(2, attempt - 1), GRAPHQL_MAX_BACKOFF_MS);
      const jitter = Math.floor(Math.random() * 500);
      const wait = backoff + jitter;
      if (progressToast) {
        progressToast.message = `Rate-limited, retrying in ${Math.round(wait / 1000)}s (attempt ${attempt + 1} of ${GRAPHQL_MAX_ATTEMPTS})…`;
      }
      await delay(wait);
    }
  }

  throw lastError ?? new Error("Failed to fetch Instagram media after multiple attempts.");
}

export async function getInstagramMediaURLByGraphQL(shortcode: string, progressToast?: Toast, sourceUrl?: string) {
  try {
    const media = await fetchInstagramMediaWithRetry(shortcode, progressToast);

    const typenameMap: Record<string, string> = {
      XDTGraphImage: "GraphImage",
      XDTGraphVideo: "GraphVideo",
      XDTGraphSidecar: "GraphSidecar",
    };

    if (typenameMap[media.__typename]) {
      media.__typename = typenameMap[media.__typename];
    } else {
      throw new Error(`Unknown __typename in metadata: ${media.__typename}`);
    }

    if (shortcode !== media.shortcode) {
      console.warn("Shortcode has changed. Post may have been moved.");
    }

    if (media.__typename === "GraphImage") {
      return [media.display_url];
    } else if (media.__typename === "GraphVideo") {
      return [media.video_url];
    } else if (media.__typename === "GraphSidecar") {
      return media.edge_sidecar_to_children.edges.map(
        (edge: InstagramMediaEdge) => edge.node.video_url || edge.node.display_url,
      );
    }

    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await showErrorToast("Could not fetch Instagram media", message, sourceUrl);
    return null;
  }
}

export async function getInstagramStoryURL(username: string): Promise<string[] | null> {
  try {
    const response = await axios.get(`https://media.mollygram.com/?url=${username}&method=allstories`);
    const $ = cheerio.load(response.data["html"]);

    const downloadUrls: string[] = [];

    $('a[title="Download"]').each((index: number, element) => {
      const href = $(element).attr("href");
      if (href) {
        downloadUrls.push(decodeURIComponent(href.split("media=")[1]));
      }
    });

    return downloadUrls;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await showErrorToast("Could not fetch Instagram story", message);
    return null;
  }
}

export async function getInstagramHighlightStoryURL(url: string): Promise<{ img: string; url: string }[] | null> {
  try {
    const response = await axios.get(`https://media.mollygram.com/?url=${url}`);
    const $ = cheerio.load(response.data["html"]);

    const highlightUrls: { img: string; url: string }[] = [];

    $('a[title="Download"]').each((index: number, element) => {
      const href = $(element).attr("href");

      let $current = $(element);
      let imgSrc: string | undefined;

      for (let i = 0; i < 5; i++) {
        const $container = $current.parent();
        if (!$container.length) break;

        const posterSrc = $container.find("video").attr("poster");
        const imageSrc = $container.find("img").attr("src");

        if (posterSrc || imageSrc) {
          imgSrc = posterSrc || imageSrc;
          break;
        }

        $current = $container;
      }

      if (href && imgSrc) {
        highlightUrls.push({
          img: decodeURIComponent(imgSrc.split("media=")[1]),
          url: decodeURIComponent(href.split("media=")[1]),
        });
      }
    });

    return highlightUrls;
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
