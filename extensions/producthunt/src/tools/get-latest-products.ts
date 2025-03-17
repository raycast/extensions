import Parser from "rss-parser";
import fetch from "node-fetch";

interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  author: string;
  content: string;
  contentSnippet: string;
  id: string;
  isoDate: string;
  updated: string;
}

/**
 * Returns the latest products from Product Hunt.
 * Only returns essential information about each product unless specifically asked for more details.
 */
export default async function () {
  try {
    const response = await fetch("https://www.producthunt.com/feed?category=undefined");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.text();
    if (!data) {
      return [];
    }

    const parser: Parser = new Parser({
      customFields: {
        item: ["updated"],
      },
    });

    const feed = await parser.parseString(data);
    const items = feed.items as FeedItem[];

    return items.map((item) => ({
      title: item.title,
      description: getCleanDescription(item.content),
      author: item.author,
      link: item.link,
      publishedAt: new Date(item.updated).toISOString(),
    }));
  } catch (error) {
    console.error("Error fetching Product Hunt data:", error);
    throw error;
  }
}

function getCleanDescription(text: string): string {
  const cleanedText = text
    .replace(/<[^>]*>/g, "")
    .replace(/\b(Discussion|Link)\b|\s*\|\s*/g, "")
    .trim();

  const sentences = cleanedText.split(/(?<=[.!?])\s+/);
  return sentences[0] || "";
}
