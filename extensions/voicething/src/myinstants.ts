import { MemeClip } from "./types";
import { VoiceThingError } from "./errors";

const DEFAULT_BASE_URL = "https://www.myinstants.com";

export async function searchClips(
  query: string,
  quantity = 36,
  signal?: AbortSignal,
): Promise<MemeClip[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const url = new URL("/en/search/", DEFAULT_BASE_URL);
  url.searchParams.set("name", trimmedQuery);

  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X) VoiceThing-Raycast/1.0",
    },
    signal,
  });

  if (!response.ok) {
    throw new VoiceThingError(
      `The sound source returned HTTP ${response.status}.`,
    );
  }

  const html = await response.text();
  return parseSearchResults(html, DEFAULT_BASE_URL, quantity);
}

export function parseSearchResults(
  html: string,
  baseURL = DEFAULT_BASE_URL,
  limit = 36,
): MemeClip[] {
  const chunks = html.split('<div class="instant">').slice(1);
  const results: MemeClip[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    const soundPath = firstMatch(chunk, /play\('([^']+)'/i, 1);
    const slug = firstMatch(
      chunk,
      /play\('[^']+'\s*,\s*'[^']+'\s*,\s*'([^']+)'\)/i,
      1,
    );

    if (!soundPath || !slug || seen.has(slug)) {
      continue;
    }

    const soundURL = new URL(soundPath, baseURL).toString();
    const linkTitle = firstMatch(
      chunk,
      /<a[^>]*class="[^"]*instant-link[^"]*"[^>]*>(.*?)<\/a>/is,
      1,
    );
    const fallbackTitle = firstMatch(
      chunk,
      /title="Play\s+(.*?)\s+sound"/is,
      1,
    );
    const title = htmlDecode(
      stripHTML(linkTitle ?? fallbackTitle ?? slug.replace(/-/g, " ")),
    ).trim();
    const sourceURL = new URL(`/en/instant/${slug}/`, baseURL).toString();
    const tags = title
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean)
      .slice(0, 4);

    seen.add(slug);
    results.push({
      id: `myinstants-${slug}`,
      name: title || slug.replace(/-/g, " "),
      soundURL,
      category: "MyInstants",
      tags,
      sourceURL,
    });

    if (results.length >= limit) {
      break;
    }
  }

  return results;
}

function firstMatch(
  text: string,
  pattern: RegExp,
  group: number,
): string | undefined {
  const match = pattern.exec(text);
  return match?.[group];
}

function stripHTML(text: string): string {
  return text.replace(/<[^>]+>/g, "");
}

function htmlDecode(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\\u002D/g, "-");
}
