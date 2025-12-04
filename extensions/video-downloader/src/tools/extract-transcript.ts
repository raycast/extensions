import { withCache } from "@raycast/utils";
import extractTranscript from "../transcript.js";

type Input = {
  /**
   * The URL of the video to get transcript from.
   */
  url: string;
  /**
   * The language code for the transcript (e.g., 'en', 'es', 'fr').
   * Defaults to 'en' if not specified.
   */
  language?: string;
};

export default async function tool(input: Input) {
  const { url, language = "en" } = input;

  const cachedTranscript = withCache(extractTranscript);
  const { transcript } = await cachedTranscript(url, language);

  return transcript;
}
