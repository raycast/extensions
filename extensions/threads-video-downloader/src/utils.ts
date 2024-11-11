import axios from "axios";
import { createWriteStream, existsSync } from "fs";
import { showToast, Toast } from "@raycast/api";

export async function getThreadsVideoURL(threadsUrl: string) {
  try {
    const response = await axios.get(`https://api.threadsphotodownloader.com/v2/media?url=${threadsUrl}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      },
    });

    const videoUrls = response.data["video_urls"];

    return videoUrls;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Error:", error.message);
    } else {
      console.error("Error:", (error as Error).message);
    }
    return null;
  }
}

export async function handleDownload(videoUrl: string, videoId: string, downloadFolder: string) {
  let filePath = `${downloadFolder}/${videoId.substring(0, 100)}.mp4`;
  let counter = 1;

  while (existsSync(filePath)) {
    filePath = `${downloadFolder}/${videoId.substring(0, 100)}(${counter}).mp4`;
    counter++;
  }

  const writer = createWriteStream(filePath);

  const progressToast = await showToast({
    title: "Downloading Video",
    message: "0%",
    style: Toast.Style.Animated,
  });

  try {
    const response = await axios.get(videoUrl, {
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
      message: `Video saved to ${filePath}`,
      style: Toast.Style.Success,
    });
  } catch (error) {
    await showToast({
      title: "Error While Downloading Video",
      message: error instanceof Error ? error.message : "Unknown error occurred",
      style: Toast.Style.Failure,
    });
  }
}
