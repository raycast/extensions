import { Toast, popToRoot, showToast } from "@raycast/api";
import { YoutubeTranscript } from "youtube-transcript";

async function getVideoTranscript(video: string) {
  const transcript = await YoutubeTranscript.fetchTranscript(video)
    .then((result) => {
      const joinedTranscription = result
        .map((item) => item.text)
        .join(" ")
        .replaceAll("\n", " ");

      return joinedTranscription;
    })
    .catch(() => {
      showToast({
        style: Toast.Style.Failure,
        title: "❗",
        message: "Sorry, this video doesn't have a transcript.",
      });
      popToRoot();
      return undefined;
    });

  return transcript;
}

export default getVideoTranscript;
