import { createHash } from "crypto";
import Parser from "rss-parser";

/** A parsed XML element: attributes under `$`, child elements as arrays. */
type XmlElement = { $?: Record<string, string> } & Record<string, unknown>;

/** A feed that keeps an item's date in an element rss-parser does not read. */
type ItemDateSource = {
  /** Item child element to parse, passed to rss-parser's `customFields`. */
  field: string;
  /** Returns the date string, or undefined when the element is not this feed's. */
  read: (element: XmlElement) => string | undefined;
};

const ISO_WITHOUT_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

function childText(element: XmlElement, name: string) {
  const value = element[name];
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === "string" ? first.trim() || undefined : undefined;
}

/** Gives an ISO date without an offset the feed's own offset; other dates pass through. */
function withDefaultOffset(date: string | undefined, offset: string) {
  return date && ISO_WITHOUT_OFFSET.test(date) ? date + offset : date;
}

/** Add an entry here for each feed whose dates sit outside the standard item fields. */
const ITEM_DATE_SOURCES: ItemDateSource[] = [
  {
    // Mikan Project: `<torrent xmlns="https://mikanani.me/0.1/"><pubDate>`, China Standard Time with no offset.
    field: "torrent",
    read: (torrent) =>
      torrent.$?.xmlns === "https://mikanani.me/0.1/"
        ? withDefaultOffset(childText(torrent, "pubDate"), "+08:00")
        : undefined,
  },
];

export type StoryItem = Parser.Item & Record<string, unknown>;

export const storyParser = new Parser<Record<string, unknown>, Record<string, unknown>>({
  customFields: { item: ITEM_DATE_SOURCES.map(({ field }) => field) },
});

/**
 * Returns the item's publish date, falling back to `ITEM_DATE_SOURCES` when the item has none.
 */
export function getStoryPubDate(item: StoryItem): string | undefined {
  if (item.pubDate) {
    return item.pubDate;
  }
  for (const { field, read } of ITEM_DATE_SOURCES) {
    const element = item[field];
    const date = element && typeof element === "object" ? read(element as XmlElement) : undefined;
    if (date) {
      return date;
    }
  }
  return undefined;
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
