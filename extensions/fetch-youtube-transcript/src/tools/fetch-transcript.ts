import { getPreferenceValues } from "@raycast/api";
import { extractVideoId, getVideoTranscript } from "../utils";

type Input = {
  /**
   * The URL of the YouTube video to fetch the transcript for.
   * Accepts the usual YouTube link formats, including watch links
   * (https://www.youtube.com/watch?v=ID), share links (https://youtu.be/ID),
   * Shorts (https://www.youtube.com/shorts/ID) and livestream replays
   * (https://www.youtube.com/live/ID).
   */
  videoUrl: string;
  /**
   * Optional two-letter ISO 639-1 language code for the transcript, e.g. "en",
   * "hi", "es". Only set this when the user asks for a specific language.
   * When omitted, the language configured in the extension preferences is used.
   * Note that a video only has captions in the languages its uploader or
   * YouTube's auto-captioning provides.
   */
  language?: string;
  /**
   * Optional maximum number of characters to return. Use this for long videos
   * to keep the response manageable. When the transcript is longer than this,
   * the response is cut short and `truncated` is set to true.
   * When omitted, the full transcript is returned.
   */
  maxLength?: number;
  /**
   * Optional character position to start reading from, defaulting to 0.
   * Combine with `maxLength` to read a long transcript in successive chunks:
   * after a truncated response, call again with `offset` set to
   * `offset + maxLength` to get the next portion.
   */
  offset?: number;
};

const TRUNCATION_MARKER = "\n\n[... transcript truncated ...]";

/**
 * Fetches the transcript of a YouTube video as plain text so it can be
 * summarised, translated, or turned into notes.
 */
export default async function tool(input: Input) {
  const videoId = extractVideoId(input.videoUrl);
  if (!videoId) {
    throw new Error(
      `"${input.videoUrl}" is not a recognised YouTube video URL. Ask the user for a link that points to a single video.`,
    );
  }

  const { defaultLanguage } = getPreferenceValues<Preferences>();
  const language = input.language || defaultLanguage || "en";

  const { transcript, title } = await getVideoTranscript(videoId, language);

  // The full transcript is always measured before any windowing, so the model
  // can see the true size of the video even when it only receives a slice.
  const totalCharacters = transcript.length;

  const offset = Math.max(0, Math.trunc(input.offset ?? 0));
  const maxLength = input.maxLength !== undefined ? Math.max(1, Math.trunc(input.maxLength)) : undefined;

  const end = maxLength !== undefined ? offset + maxLength : totalCharacters;
  const window = transcript.slice(offset, end);
  const truncated = end < totalCharacters;

  return {
    title,
    videoId,
    language,
    /** The transcript text for the requested window. */
    transcript: truncated ? window + TRUNCATION_MARKER : window,
    /** Length of the complete transcript, regardless of how much was returned. */
    totalCharacters,
    /** Character position this window started at. */
    offset,
    /** Character position the next chunk should start at, or null if this is the end. */
    nextOffset: truncated ? end : null,
    /**
     * True when the returned text stops before the end of the transcript.
     * Do not describe the video as fully covered while this is true.
     */
    truncated,
  };
}
