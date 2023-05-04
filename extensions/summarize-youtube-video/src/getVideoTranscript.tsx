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

  if (!data) {
    return { transcriptLoading: isLoading, rawTranscript: undefined };
  }

  return { transcriptLoading: isLoading, rawTranscript: data };
}
