import { popToRoot, showToast, Toast } from "@raycast/api";
import { fetchTranscript } from "./transcriptFetcher";

export async function getVideoTranscript(video: string): Promise<string | undefined> {
  try {
    return await fetchTranscript(video);
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
