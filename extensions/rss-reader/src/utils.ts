import { createHash } from "crypto";
import Parser from "rss-parser";

/** A parsed XML element: attributes under `$`, text under `_`, child elements as arrays. */
type XmlElement = { $?: Record<string, string>; _?: string } & Record<string, unknown>;

/** A story item, plus the date found by the nested-date fallback when the item has no standard one. */
export type StoryItem = Parser.Item & { nestedDate?: string };

// Element names that hold an item's date, publication names first.
const DATE_ELEMENT_NAMES = ["pubdate", "published", "issued", "created", "date", "updated", "modified"];
const ISO_WITHOUT_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;
const RFC822_WITHOUT_ZONE = /^([A-Za-z]{3},\s*)?\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4}\s+\d{2}:\d{2}(:\d{2})?$/;

function elementText(value: unknown) {
  const first = Array.isArray(value) ? value[0] : value;
  const text = typeof first === "string" ? first : (first as XmlElement | undefined)?._;
  return typeof text === "string" ? text.trim() || undefined : undefined;
}

function isElement(value: unknown): value is XmlElement {
  return typeof value === "object" && value !== null;
}

/**
 * Finds a date in an item's raw elements for feeds that put it somewhere non-standard,
 * such as Mikan Project's `<torrent><pubDate>`. Searches nearest elements first; at the same
 * depth, publication names win over update names.
 */
function findNestedDate(raw: XmlElement): string | undefined {
  let level: XmlElement[] = [raw];
  while (level.length > 0) {
    let best: { rank: number; date: string } | undefined;
    const next: XmlElement[] = [];
    for (const element of level) {
      for (const [key, value] of Object.entries(element)) {
        if (key === "$" || key === "_") continue;
        const rank = DATE_ELEMENT_NAMES.indexOf((key.split(":").pop() ?? key).toLowerCase());
        const date = rank >= 0 ? elementText(value) : undefined;
        if (date && !Number.isNaN(Date.parse(date)) && (!best || rank < best.rank)) {
          best = { rank, date };
        }
        for (const child of Array.isArray(value) ? value : [value]) {
          if (isElement(child)) next.push(child);
        }
      }
    }
    if (best) return best.date;
    level = next;
  }
  return undefined;
}

export const storyParser = new Parser();

// rss-parser drops elements it does not know, so read nested dates from the raw item while
// it is built. These are rss-parser's internal per-item builders; the fixture tests cover them.
type ItemBuilder = (this: Parser, raw: XmlElement, ...rest: unknown[]) => StoryItem;
const builders = storyParser as unknown as Record<"parseItemRss" | "parseItemAtom", ItemBuilder>;
for (const name of ["parseItemRss", "parseItemAtom"] as const) {
  const build = builders[name];
  builders[name] = function (raw, ...rest) {
    const item = build.call(this, raw, ...rest);
    if (!item.pubDate) {
      item.nestedDate = findNestedDate(raw);
    }
    return item;
  };
}

/** Milliseconds `timeZone` is ahead of UTC at the instant `utc`. */
function timeZoneOffset(timeZone: string, utc: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(new Date(utc));
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  const wall = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
  return wall - (utc - (((utc % 1000) + 1000) % 1000));
}

/** Reads a date that has no zone as wall-clock time in `timeZone`; returns undefined for other dates. */
function inTimeZone(date: string, timeZone: string) {
  const wall = ISO_WITHOUT_ZONE.test(date)
    ? Date.parse(date + "Z")
    : RFC822_WITHOUT_ZONE.test(date)
      ? Date.parse(date + " GMT")
      : NaN;
  if (Number.isNaN(wall)) return undefined;
  try {
    // A second pass settles the offset for times near a daylight saving change.
    const utc = wall - timeZoneOffset(timeZone, wall - timeZoneOffset(timeZone, wall));
    return new Date(utc).toISOString();
  } catch {
    return undefined;
  }
}

/**
 * Returns the item's publish date: its standard date, else one found in nested elements.
 * A date without a zone is read in the feed's `timeZone` when set, otherwise in local time.
 */
export function getStoryPubDate(item: StoryItem, timeZone?: string): string | undefined {
  const date = item.pubDate || item.nestedDate;
  return (date && timeZone && inTimeZone(date, timeZone)) || date;
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
