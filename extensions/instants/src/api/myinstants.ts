import * as cheerio from "cheerio";
import { Sound } from "../types";

const BASE_URL = "https://www.myinstants.com";

function parseSoundsFromHTML(html: string): Sound[] {
  const $ = cheerio.load(html);
  const sounds: Sound[] = [];

  $(".instant").each((_, elem) => {
    const $elem = $(elem);
    const link = $elem.find(".instant-link");
    const button = $elem.find(".small-button");
    const onclick = button.attr("onclick") || "";

    // Parse: play('/media/sounds/movie_1.mp3', 'loader-23010', 'bruh')
    const match = onclick.match(/play\('([^']+)',\s*'loader-(\d+)',\s*'([^']+)'\)/);
    if (!match) return;

    const [, soundPath, id, slug] = match;
    const name = link.text().trim();
    const href = link.attr("href") || "";
    const colorStyle = $elem.find(".small-button-background").attr("style") || "";
    const colorMatch = colorStyle.match(/background-color:\s*([^;]+)/);

    sounds.push({
      id,
      name,
      slug,
      soundUrl: `${BASE_URL}${soundPath}`,
      pageUrl: `${BASE_URL}${href}`,
      color: colorMatch ? colorMatch[1].trim() : undefined,
    });
  });

  return sounds;
}

export async function searchSounds(query: string): Promise<Sound[]> {
  const url = `${BASE_URL}/en/search/?name=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });
  if (!response.ok) {
    throw new Error(`Search failed: ${response.status} ${response.statusText}`);
  }
  const html = await response.text();
  return parseSoundsFromHTML(html);
}

export async function getTrendingSounds(): Promise<Sound[]> {
  const url = `${BASE_URL}/en/trending/`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to load trending: ${response.status} ${response.statusText}`);
  }
  const html = await response.text();
  return parseSoundsFromHTML(html);
}
