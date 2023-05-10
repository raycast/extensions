import { Toast, popToRoot, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { YoutubeTranscript } from "youtube-transcript";

export default function getVideoTranscript(video: string) {
  const { isLoading, data } = usePromise(async () => {
    const transcriptCaptions = await YoutubeTranscript.fetchTranscript(video);
    const transcript = transcriptCaptions
      .map((item) => item.text)
      .join(" ")
      .replaceAll("\n", " ");
    return transcript;
  });

  if (!isLoading && !data) {
    showToast({
      style: Toast.Style.Failure,
      title: "❗",
      message: "Sorry, this video doesn't have a transcript.",
    });
    popToRoot();
    return { transcriptLoading: isLoading, rawTranscript: undefined };
  }

  return { transcriptLoading: isLoading, rawTranscript: data };
}
