import { linkTextForAI } from "../lib/link-chat.js";
import { loadLinkContext } from "../lib/link-loader.js";

type Input = {
  /**
   * The link: a video (YouTube, TikTok, X, Vimeo…), a social post (Instagram, Reddit, Pinterest…) or any web page or article.
   */
  url: string;
  /**
   * For videos only: the caption language code (e.g. 'en', 'es', 'pt-BR').
   * Leave empty for the video's own language, falling back to English.
   */
  language?: string;
};

/** A BCP-47-ish language tag: `en`, `es`, `en-US`, `pt-BR`. */
const LANGUAGE_RE = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;

/**
 * Read what a link says — use it to summarize or answer questions about it. It
 * includes the link's details and statistics, so get-link-info isn't needed
 * as well. Returns the details followed by the text: a video's transcript with one
 * `[m:ss]` timestamped line per ~30 seconds, a post's caption, or an
 * article's text. Shares Chat About Link's cache, so asking about the same
 * link again is instant. Refuses local and private network addresses.
 */
export default async function tool(input: Input) {
  const language = input.language && LANGUAGE_RE.test(input.language) ? input.language : "auto";
  // loadLinkContext rejects anything that isn't an http(s) link before a tool runs.
  // Pages that refuse apps or have no text fall back to the Internet Archive's copy, labelled as such.
  return linkTextForAI(await loadLinkContext(input.url, { language, archiveFallback: true }));
}
