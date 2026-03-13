import axios from "axios";
import { createWriteStream, existsSync } from "fs";
import { showToast, Toast, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import * as cheerio from "cheerio";

interface InstagramMediaEdge {
  node: {
    video_url?: string;
    display_url: string;
  };
}

export async function getInstagramMediaURLByGraphQL(shortcode: string) {
  const docId = "8845758582119845";
  const variables = {
    shortcode,
  };

  const params = new URLSearchParams({
    doc_id: docId,
    variables: JSON.stringify(variables),
  });

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    "X-Requested-With": "XMLHttpRequest",
    "X-Instagram-AJAX": "1",
    Referer: "https://www.instagram.com/",
    Origin: "https://www.instagram.com",
  };

  try {
    const response = await axios.get(`https://www.instagram.com/graphql/query?${params.toString()}`, { headers });

    const media = response.data?.data?.xdt_shortcode_media;

    if (!media) throw new Error("Invalid response or shortcode not found");

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
    showFailureToast(error, { title: "Could not fetch Instagram media" });
    return null;
  }
}

export async function getInstagramStoryURL(username: string): Promise<string[]> {
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
    showFailureToast(error, { title: "Could not fetch Instagram story" });
    return [];
  }
}

export async function getInstagramHighlightStoryURL(url: string) {
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
    showFailureToast(error, { title: "Could not fetch Instagram highlight story" });
    return [];
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
    await showToast({
      title: "Error While Downloading Media",
      message: error instanceof Error ? error.message : "Unknown error occurred",
      style: Toast.Style.Failure,
    });
  }
}
