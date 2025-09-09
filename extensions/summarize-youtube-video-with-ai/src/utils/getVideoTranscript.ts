import { popToRoot, showToast, Toast } from "@raycast/api";
// @ts-expect-error - youtube-transcript-api doesn't have TypeScript types
import TranscriptClient from "youtube-transcript-api";

function extractVideoId(video: string): string {
  if (video.includes("youtube.com/watch?v=")) {
    return video.split("v=")[1].split("&")[0];
  }
  if (video.includes("youtu.be/")) {
    return video.split("youtu.be/")[1].split("?")[0];
  }
  return video;
}

export async function getVideoTranscript(video: string) {
  try {
    const client = new TranscriptClient();
    await client.ready;

    const videoId = extractVideoId(video);
    const result = await client.getTranscript(videoId);

    if (result.tracks.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "❗",
        message: "Sorry, this video doesn't have a transcript.",
      });
      popToRoot();
      return undefined;
    }

    const joinedTranscription = result.tracks[0].transcript
      .map((item: { text: string }) => item.text)
      .join(" ")
      .replaceAll("\n", " ");

    return joinedTranscription;
  } catch {
    showToast({
      style: Toast.Style.Failure,
      title: "❗",
      message: "Sorry, this video doesn't have a transcript.",
    });
    popToRoot();
    return undefined;
  }
}
