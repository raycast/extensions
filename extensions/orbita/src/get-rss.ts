import Parser from "rss-parser";

export interface OrbitaPost {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  author?: string;
  contentSnippet?: string;
}

const ORBITA_RSS_URL = "https://manualdousuario.net/feed/?post_type=orbita_post";
const parser = new Parser();

export async function fetchOrbitaPosts(): Promise<OrbitaPost[]> {
  try {
    const feed = await parser.parseURL(ORBITA_RSS_URL);

    const posts: OrbitaPost[] = feed.items.map((item) => ({
      id: item.guid || item.link || "",
      title: item.title || "",
      link: item.link || "",
      pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
      author: item.creator || item.author || "",
      contentSnippet: item.contentSnippet || item.content || "",
    }));

    return posts;
  } catch (error) {
    console.error("Error fetching Orbita posts:", error);
    throw error;
  }
}
