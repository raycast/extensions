import { YoutubeTranscript } from "youtube-transcript";

export async function fetchYoutubeTranscript(url: string, attempts = 3): Promise<string> {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(url);
      if (!transcript || transcript.length === 0) {
        throw new Error("Transcript is empty");
      }
      return transcript.map((t) => t.text).join(" ");
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        await new Promise((res) => setTimeout(res, 500));
      }
    }
  }
  throw lastError || new Error("Failed to fetch transcript");
}
