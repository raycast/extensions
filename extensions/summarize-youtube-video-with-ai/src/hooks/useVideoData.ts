import { showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { ALERT } from "../const/toast_messages";
import { getVideoData, type VideoDataTypes } from "../utils/getVideoData";
import { getVideoTranscript } from "../utils/getVideoTranscript";

export function useVideoData(videoURL: string | null | undefined) {
  const [videoData, setVideoData] = useState<VideoDataTypes>();
  const [transcript, setTranscript] = useState<string | undefined>();

  useEffect(() => {
    if (!videoURL) return;

    getVideoData(videoURL)
      .then(setVideoData)
      .catch((error: Error) => {
        showToast({
          style: Toast.Style.Failure,
          title: ALERT.title,
          message: `Error fetching video data: ${error.message}`,
        });
      });
    getVideoTranscript(videoURL)
      .then(setTranscript)
      .catch((error: Error) => {
        showToast({
          style: Toast.Style.Failure,
          title: ALERT.title,
          message: `Error fetching video transcript: ${error.message}`,
        });
      });
  }, [videoURL]);

  return { videoData, transcript };
}
