import { createHash } from "crypto";
import Parser from "rss-parser";

/** Mikan Project nests each item's date in `<torrent xmlns="https://mikanani.me/0.1/"><pubDate>`. */
type TorrentFields = {
  torrent?: { $?: { xmlns?: string }; pubDate?: string[] };
};

export type StoryItem = Parser.Item & TorrentFields;

const MIKAN_TORRENT_NAMESPACE = "https://mikanani.me/0.1/";
// Mikan writes China Standard Time without an offset, e.g. `2026-11-06T11:08:00`.
const MIKAN_UTC_OFFSET = "+08:00";
const ISO_WITHOUT_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

export const storyParser = new Parser<Record<string, unknown>, TorrentFields>({
  customFields: { item: ["torrent"] },
});

/**
 * Returns the item's publish date, falling back to Mikan's torrent `pubDate` when the item has none.
 */
export function getStoryPubDate(item: StoryItem): string | undefined {
  if (item.pubDate) {
    return item.pubDate;
  }
  const torrentDate = item.torrent?.pubDate?.[0]?.trim();
  if (!torrentDate) {
    return undefined;
  }
  if (item.torrent?.$?.xmlns === MIKAN_TORRENT_NAMESPACE && ISO_WITHOUT_OFFSET.test(torrentDate)) {
    return torrentDate + MIKAN_UTC_OFFSET;
  }
  return torrentDate;
}

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
