import { withCache } from "@raycast/utils";
import extractTranscript from "../transcript.js";
import { isValidUrl } from "../lib/url.js";

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

// Hoisted to module scope so the cache wrapper is created ONCE — recreating it
// per call (the previous behaviour) defeated caching entirely. `maxAge` bounds
// staleness so newly-added captions can surface, and `validate` keeps an empty
// transcript from being served from cache.
const cachedTranscript = withCache(extractTranscript, {
  maxAge: 24 * 60 * 60 * 1000,
  validate: (result) => result.transcript.trim().length > 0,
});

/** A BCP-47-ish language tag: `en`, `es`, `en-US`, `pt-BR`. */
const LANGUAGE_RE = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;

export default async function tool(input: Input) {
  // The interactive commands gate URLs through isValidUrl; this model-driven
  // entry point must too (defense in depth against a prompt-injected value).
  if (!isValidUrl(input.url)) {
    throw new Error("Invalid URL — provide an http(s) video URL.");
  }
  const language = input.language && LANGUAGE_RE.test(input.language) ? input.language : "en";

  const { transcript } = await cachedTranscript(input.url, language);

  return transcript;
}
