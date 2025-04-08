import * as cheerio from "cheerio";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<{ email: string }>();
let cachedData: Match[] | null = null;
let lastFetchTime = 0;

export type Match = {
  team1: string;
  team2: string;
  team1Icon?: string;
  team2Icon?: string;
  time: string;
  timestamp: number;
  streams: string[];
};

export async function getUpcomingMatches(): Promise<Match[]> {
  const headers = {
    "User-Agent": `Raycast-Liquipedia-Extension/1.0 (https://raycast.com; ${preferences.email || "your@email.com"})`,
    "Accept-Encoding": "gzip",
  };
  if (!preferences.email) {
    console.warn("No email provided in preferences — Liquipedia may block this request.");
  }
  const now = Date.now();
  const cacheDuration = 30 * 1000; // 30 seconds

  if (cachedData && now - lastFetchTime < cacheDuration) {
    return cachedData;
  }
  if (now - lastFetchTime < 30000) {
    console.warn("Respecting Liquipedia rate limits");
  }

  const apiUrl = "https://liquipedia.net/counterstrike/api.php?action=parse&page=Liquipedia:Matches&format=json";

  const res = await fetch(apiUrl, {
    headers: headers,
  });

  const { parse } = await res.json();
  const html = parse.text["*"];
  const $ = cheerio.load(html);

  const matches: Match[] = [];

  const seen = new Set<string>();

  $("table.infobox_matches_content").each((_, table) => {
    const $table = $(table);

    const team1 = $table.find(".team-left .team-template-text a").first().text().trim();
    const team2 = $table.find(".team-right .team-template-text a").first().text().trim();

    const timerEl = $table.find(".timer-object").first();
    const timestampAttr = timerEl.attr("data-timestamp");
    const timestamp = timestampAttr ? parseInt(timestampAttr, 10) : 0;
    const timeText = timerEl.text().replace(/\s+/g, " ").trim();

    const team1Logo = $table.find(".team-left img").attr("src");
    const team2Logo = $table.find(".team-right img").attr("src");

    const team1Icon = team1Logo ? "https://liquipedia.net" + team1Logo : undefined;
    const team2Icon = team2Logo ? "https://liquipedia.net" + team2Logo : undefined;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStartUnix = Math.floor(todayStart.getTime() / 1000);

    if (timestampAttr < todayStartUnix) {
      return; // skip past match
    }

    const streams: string[] = [];

    $table.find("a[href*='Special:Stream']").each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        const fullUrl = "https://liquipedia.net" + href;
        streams.push(fullUrl);
      }
    });

    const key = `${team1}|${team2}|${timestamp || timeText}`;
    if (team1 && team2 && !seen.has(key)) {
      seen.add(key);
      matches.push({
        team1,
        team2,
        team1Icon,
        team2Icon,
        time: timeText,
        timestamp,
        streams,
      });
    }
  });

  lastFetchTime = now;
  cachedData = matches;

  return matches;
}
