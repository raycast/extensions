import { Icon } from "@raycast/api";
import { loadChats } from "../lib/chat-store.js";
import { loadHistory } from "../lib/history.js";
import { KIND_ICON } from "../lib/kinds.js";
import { mentionUri, recentLinks, searchRecentLinks } from "../lib/mentions.js";

type Input = {
  /**
   * What the user typed after choosing Recent Links in the `@` menu. Empty for the default list.
   */
  query: string;
};

type Item = {
  title: string;
  /** Identifies the link; the resource provider (src/read-mention.ts) reads it when the message is sent. */
  uri: string;
  description?: string;
  icon?: string;
};

/**
 * A mention search for Raycast AI Chat's `@` menu, not an AI tool: the links
 * the user downloaded or chatted about, newest first. Picking one attaches
 * what the link says — a video's transcript, a post's caption or an article.
 */
export default async function tool(input: Input): Promise<Item[]> {
  // Either store failing still leaves the other's links to offer.
  const [chats, history] = await Promise.all([loadChats().catch(() => []), loadHistory().catch(() => [])]);
  return searchRecentLinks(recentLinks(chats, history), input.query ?? "").map((link) => ({
    title: link.title,
    uri: mentionUri(link.url),
    description: link.description || undefined,
    icon: link.source === "chat" ? Icon.SpeechBubble : KIND_ICON[link.source],
  }));
}
