import { createHash } from "crypto";
import type Parser from "rss-parser";

/**
 * Returns an identifier that stays the same across fetches, so read state can be matched later.
 * Atom entries carry `id` instead of `guid`; items without either fall back to their link,
 * then to a hash of the feed URL, title, publish date and content.
 */
export function getStoryGuid(item: Parser.Item & { id?: string }, feedUrl: string) {
  return (
    item.guid ||
    item.id ||
    item.link ||
    createHash("sha1").update([feedUrl, item.title, item.pubDate, item.content].join("\n")).digest("hex")
  );
}

/**
 * Returns when a story was last read, or 0 if never.
 * The AI tools used to key Atom entries by link, so read marks saved before `id` was used are found by link.
 */
export function getStoryLastRead(storyLastRead: Record<string, number>, guid: string, link?: string) {
  return storyLastRead[guid] || (link && storyLastRead[link]) || 0;
}
