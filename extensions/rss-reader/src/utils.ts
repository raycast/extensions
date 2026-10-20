import { createHash } from "crypto";
import type Parser from "rss-parser";

/**
 * Returns an identifier that stays the same across fetches, so read state can be matched later.
 * Atom entries carry `id` instead of `guid`; items without either fall back to their link,
 * then to a hash of the feed URL, title and publish date.
 */
export function getStoryGuid(item: Parser.Item & { id?: string }, feedUrl: string) {
  return (
    item.guid ||
    item.id ||
    item.link ||
    createHash("sha1").update([feedUrl, item.title, item.pubDate].join("\n")).digest("hex")
  );
}
