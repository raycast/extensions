import { loadVideoContext } from "../lib/context-cache.js";
import { isValidUrl } from "../lib/url.js";
import { transcriptForAI } from "../lib/video-chat.js";

type Input = {
  /**
   * The URL of the video to get transcript from.
   */
  url: string;
  /**
   * The language code for the transcript (e.g., 'en', 'es', 'fr').
   * Leave empty for the video's own language, falling back to English.
   */
  language?: string;
};

/** A BCP-47-ish language tag: `en`, `es`, `en-US`, `pt-BR`. */
const LANGUAGE_RE = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;

/**
 * The video's details followed by its transcript, one `[m:ss]` timestamped line
 * per ~30 seconds. Shares Chat About Video's cache, so asking about the same
 * video again is instant.
 */
export default async function tool(input: Input) {
  // The interactive commands gate URLs through isValidUrl; this model-driven
  // entry point must too (defense in depth against a prompt-injected value).
  if (!isValidUrl(input.url)) {
    throw new Error("Invalid URL — provide an http(s) video URL.");
  }
  const language = input.language && LANGUAGE_RE.test(input.language) ? input.language : "auto";
  const ctx = await loadVideoContext(input.url, { language });
  return transcriptForAI(ctx);
}
