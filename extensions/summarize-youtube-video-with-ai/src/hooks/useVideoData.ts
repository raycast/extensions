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

    let cancelled = false;

    Promise.all([getVideoData(videoURL), getVideoTranscript(videoURL)])
      .then(([data, t]) => {
        if (cancelled) return;
        setVideoData(data);
        setTranscript(t);
      })
      .catch((error: Error) => {
        if (cancelled) return;
        showToast({
          style: Toast.Style.Failure,
          title: ALERT.title,
          message: `Error fetching video data or transcript: ${error.message}`,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [videoURL]);

  return { videoData, transcript };
}
