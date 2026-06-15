import { XMLParser } from "fast-xml-parser";
import { Product } from "../types";
import { cleanText } from "../util/textUtils";
import { logger } from "@chrismessina/raycast-logger";

const FEED_URL = "https://www.producthunt.com/feed";
const feedLog = logger.child("[ProductHuntFeed]");

interface RawEntry {
  id?: string;
  title?: string | number | boolean | { "#text"?: string };
  link?: { "@_rel"?: string; "@_href"?: string } | Array<{ "@_rel"?: string; "@_href"?: string }>;
  published?: string;
  updated?: string;
  author?: { name?: string };
  content?: string | number | boolean | { "#text"?: string };
}

function textOf(v: string | number | boolean | { "#text"?: string } | undefined): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return v["#text"] ?? "";
}

function alternateHref(entry: RawEntry): string {
  const links = Array.isArray(entry.link) ? entry.link : entry.link ? [entry.link] : [];
  const alt = links.find((l) => l["@_rel"] === "alternate") ?? links[0];
  return alt?.["@_href"] ?? "";
}

function numericPostId(rawId: string | undefined): string | null {
  if (!rawId) return null;
  const m = rawId.match(/Post\/(\d+)/);
  return m ? m[1] : null;
}

function firstParagraphText(contentHtml: string): string {
  const m = contentHtml.match(/<p>([\s\S]*?)<\/p>/i);
  const inner = m ? m[1] : contentHtml;
  return cleanText(inner.replace(/<[^>]+>/g, "").trim());
}

export function parseAtomFeed(xml: string): Product[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", parseTagValue: false });
  let doc: { feed?: { entry?: RawEntry | RawEntry[] } };
  try {
    doc = parser.parse(xml);
  } catch (error) {
    throw new Error(`Failed to parse Atom feed XML: ${error instanceof Error ? error.message : "unknown"}`);
  }
  if (!doc.feed) {
    throw new Error("Atom feed missing <feed> root element");
  }
  const rawEntries = doc.feed.entry ? (Array.isArray(doc.feed.entry) ? doc.feed.entry : [doc.feed.entry]) : [];

  const seen = new Set<string>();
  const products: Product[] = [];
  for (const entry of rawEntries) {
    const id = numericPostId(entry.id);
    const url = alternateHref(entry);
    const name = cleanText(textOf(entry.title));
    if (!id || !url || !name) {
      feedLog.debug("skipping malformed feed entry", { id: entry.id });
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);

    const tagline = firstParagraphText(textOf(entry.content));
    if (!tagline) {
      feedLog.debug("feed entry produced empty tagline", { id });
    }
    products.push({
      id,
      name,
      tagline,
      description: "",
      url,
      thumbnail: "",
      votesCount: 0,
      commentsCount: 0,
      // The feed's `published` is the post's ORIGINAL creation date (can be months before a
      // re-feature); `updated` tracks recent feature activity and is closer to "launched today".
      // Prefer `updated`, falling back to `published`.
      createdAt: entry.updated ?? entry.published ?? "1970-01-01T00:00:00.000Z",
      topics: [],
      // The feed's <author> is the post submitter (same role as the API's Post.user), not a
      // verified maker — model it as submittedBy.
      submittedBy: entry.author?.name
        ? { id: `feed-${id}`, name: cleanText(entry.author.name), username: "", avatarUrl: "" }
        : undefined,
      isFeedFallback: true,
    });
  }
  return products;
}

export async function getFeedProducts(): Promise<Product[]> {
  const res = await fetch(FEED_URL, { headers: { Accept: "application/atom+xml" } });
  if (!res.ok) {
    throw new Error(`Atom feed request failed with status ${res.status}`);
  }
  const xml = await res.text();
  const products = parseAtomFeed(xml);
  feedLog.debug("parsed feed", { count: products.length });
  return products;
}
