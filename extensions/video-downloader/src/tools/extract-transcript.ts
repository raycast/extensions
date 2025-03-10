import { withCache } from "@raycast/utils";
import extractTranscript from "../transcript.js";

export default async function tool(input: { url: string; language?: string }) {
  const { url, language = "en" } = input;
  const cachedTranscript = withCache(extractTranscript);
  const { transcript } = await cachedTranscript(url, language);
  return transcript;
}
