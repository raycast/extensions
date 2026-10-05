import os from "node:os";
import { environment } from "@raycast/api";

export type HnItem = {
  id: number;
  type: string;
  title?: string;
  url?: string;
  text?: string;
  by?: string;
  deleted?: boolean;
  dead?: boolean;
  kids?: number[];
  descendants?: number;
};

export type AlgoliaItem = {
  id: number;
  author: string | null;
  text: string | null;
  created_at: string;
  children: AlgoliaItem[];
};

type AlgoliaCommentHit = {
  objectID: string;
  author: string;
  comment_text: string;
  story_id: number;
  story_title: string | null;
  created_at: string;
};

const headers = {
  "User-Agent": `Hacker News Extension, Raycast/${environment.raycastVersion} (${os.type()} ${os.release()})`,
};

async function getJson<T>(url: string) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Hacker News returned ${response.status} ${response.statusText}`);
  return (await response.json()) as T;
}

export async function getItem(id: string) {
  const item = await getJson<HnItem | null>(
    `https://hacker-news.firebaseio.com/v0/item/${encodeURIComponent(id)}.json`,
  );
  if (!item) throw new Error(`There's no Hacker News item with the id ${id}.`);
  return item;
}

export async function getTopComments(item: HnItem, count: number) {
  const kids = await Promise.all(
    (item.kids ?? []).slice(0, count + 3).map((kid) => getItem(String(kid)).catch(() => null)),
  );
  return kids
    .flatMap((kid) =>
      kid?.text && kid.by && !kid.deleted && !kid.dead ? [{ author: kid.by, text: htmlToText(kid.text) }] : [],
    )
    .slice(0, count);
}

export function getItemTree(id: string) {
  return getJson<AlgoliaItem>(`https://hn.algolia.com/api/v1/items/${encodeURIComponent(id)}`);
}

export async function searchComments(query: string, { storyId }: { storyId?: string } = {}) {
  const params = new URLSearchParams({
    query,
    tags: storyId ? `comment,story_${storyId}` : "comment",
    hitsPerPage: "20",
  });
  return getJson<{ nbHits: number; hits: AlgoliaCommentHit[] }>(`https://hn.algolia.com/api/v1/search?${params}`);
}

const namedEntities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] !== "#") return namedEntities[code.toLowerCase()] ?? match;
    const point = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return String.fromCodePoint(point);
  });
}

// Hacker News shows a link's URL as its text, cut short, so the href is the full version
export function htmlToText(html: string) {
  return decodeEntities(
    html
      .replace(/<p>/gi, "\n\n")
      .replace(/<a [^>]*href="([^"]*)"[^>]*>.*?<\/a>/gi, "$1")
      .replace(/<[^>]+>/g, ""),
  ).trim();
}

export function truncate(text: string, length: number) {
  return text.length > length ? `${text.slice(0, length)}…` : text;
}
