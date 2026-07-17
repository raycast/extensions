import { getVideoTranscript, extractVideoId } from "../utils";
import { getPreferenceValues } from "@raycast/api";

type Input = {
  /**
   * The URL of the YouTube video to fetch the transcript for.
   */
  videoUrl: string;
};

/**
 * Fetches the transcript of a YouTube video given its URL so AI can read it.
 */
export default async function ytTool(input: Input) {
  const videoId = extractVideoId(input.videoUrl);
  if (!videoId) {
    throw new Error("Invalid YouTube URL provided");
  }

  const { defaultLanguage } = getPreferenceValues<ExtensionPreferences>();

  const { transcript, title } = await getVideoTranscript(videoId, defaultLanguage || "en");

  return `Title: ${title}\n\nTranscript:\n${transcript}`;
}
