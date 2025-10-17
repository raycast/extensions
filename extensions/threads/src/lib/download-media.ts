import axios from "axios";
import { createWriteStream, existsSync } from "fs";
import { showToast, Toast, showInFinder } from "@raycast/api";

type ThreadsDolphinRadarResponse = {
  data: {
    post_detail: {
      media_list: {
        url: string;
      }[];
    };
  };
};

type ThreadsPhotoDownloaderResponse = {
  image_urls: string[];
  video_urls: { download_url: string }[];
};

const requestConfig = {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  },
};

async function getMediaFromThreadsPhotoDownloader(threadsUrl: string) {
  const response = await axios.get(
    `https://api.threadsphotodownloader.com/v2/media?url=${threadsUrl}`,
    requestConfig,
  );

  const imageUrls =
    (response.data as ThreadsPhotoDownloaderResponse)["image_urls"] || [];
  const rawVideoUrls =
    (response.data as ThreadsPhotoDownloaderResponse)["video_urls"] || [];
  const videoUrls = rawVideoUrls.map((item) => item.download_url);

  if (imageUrls.length === 0 && videoUrls.length === 0) {
    return null;
  }

  return {
    images: imageUrls,
    videos: videoUrls,
  };
}

async function getMediaFromDolphinRadar(threadsPostId: string) {
  const response = await axios.get(
    `https://www.dolphinradar.com/api/threads/post_detail/${threadsPostId}`,
    requestConfig,
  );

  const mediaList = (response.data as ThreadsDolphinRadarResponse).data
    .post_detail.media_list;

  if (!mediaList || mediaList.length === 0) {
    return null;
  }

  const { images, videos } = mediaList.reduce<{
    images: string[];
    videos: string[];
  }>(
    (acc, media) => {
      if (media.url.includes(".jpg")) {
        acc.images.push(media.url);
      } else if (media.url.includes(".mp4")) {
        acc.videos.push(media.url);
      }
      return acc;
    },
    { images: [], videos: [] },
  );

  return { images, videos };
}

export async function getThreadsMediaURL(
  threadsUrl: string,
  threadsPostId: string,
) {
  try {
    const result = await getMediaFromThreadsPhotoDownloader(threadsUrl);
    return result;
  } catch {
    try {
      return await getMediaFromDolphinRadar(threadsPostId);
    } catch {
      return null;
    }
  }
}

export async function handleDownload(
  mediaUrl: string,
  mediaId: string,
  downloadFolder: string,
  fileExtension: string,
) {
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
        title: "Show in Finder",
        onAction: async () => {
          await showInFinder(filePath);
        },
      },
    });
  } catch (error) {
    await showToast({
      title: "Error While Downloading Media",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
      style: Toast.Style.Failure,
    });
  }
}
