import { linkTextForAI } from "./lib/link-chat.js";
import { loadLinkContext } from "./lib/link-loader.js";
import { urlFromMentionUri } from "./lib/mentions.js";

type Input = {
  /**
   * The `uri` of an item the Recent Links mention search returned.
   */
  uri: string;
};

/**
 * The extension's resource provider: reads a link mentioned with `@` in
 * Raycast AI Chat, when the message is sent and whenever the AI reads it again.
 * Returns what the read-link tool does — the details, then the transcript,
 * caption or article — from the same cache, so a repeated read is instant.
 * Refuses local and private network addresses.
 */
export default async function readMention(input: Input): Promise<string> {
  const url = urlFromMentionUri(input.uri);
  if (!url) throw new Error("Unknown item — pick the link again from The Downloader's Recent Links.");
  // loadLinkContext validates the link once more before any tool or request sees it.
  return linkTextForAI(await loadLinkContext(url, { archiveFallback: true }));
}
