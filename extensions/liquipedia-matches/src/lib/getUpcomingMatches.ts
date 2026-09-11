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
  tournament: string;
  streams: string[];
};

interface LiquipediaApiResponse {
  parse: {
    text: {
      "*": string;
    };
  };
}

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

  const apiUrl = "https://liquipedia.net/counterstrike/api.php?action=parse&page=Liquipedia:Matches&format=json";

  const res = await fetch(apiUrl, {
    headers: headers,
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "Could not read error body");
    console.error(`Failed to fetch matches: ${res.status} ${res.statusText}`, errorBody);
    throw new Error(`Failed to fetch matches: ${res.status} ${res.statusText}`);
  }

  const responseData = (await res.json()) as LiquipediaApiResponse;
  const { parse } = responseData;

  if (!parse || !parse.text || typeof parse.text["*"] !== "string") {
    console.error("Unexpected API response structure:", responseData);
    throw new Error("Received unexpected data structure from Liquipedia API.");
  }

  const html = parse.text["*"];
  const $ = cheerio.load(html);

  const matches: Match[] = [];
  const seen = new Set<string>();

  $("div.match-info").each((_, matchEl) => {
    const $match = $(matchEl);

    const $leftOpponent = $match.find(".match-info-header-opponent-left");
    const $rightOpponent = $match.find(".match-info-header-opponent").not(".match-info-header-opponent-left");

    const team1 =
      $leftOpponent.find(".name a").first().text().trim() || $leftOpponent.find(".name").first().text().trim();
    const team2 =
      $rightOpponent.find(".name a").first().text().trim() || $rightOpponent.find(".name").first().text().trim();

    const timerEl = $match.find(".timer-object").first();
    const timestampAttr = timerEl.attr("data-timestamp");

    // Convert Unix timestamp (seconds) to milliseconds
    const timestampMs = timestampAttr ? parseInt(timestampAttr, 10) * 1000 : 0;
    const timestampUnix = timestampAttr ? parseInt(timestampAttr, 10) : 0;

    // Format the time string
    let timeText = "";
    if (timestampMs > 0) {
      const date = new Date(timestampMs);
      timeText = date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } else {
      timeText = timerEl.text().replace(/\s+/g, " ").trim();
    }

    const getTeamLogo = ($opponent: ReturnType<typeof $>) => {
      return (
        $opponent.find(".team-template-lightmode img").first().attr("src") ||
        $opponent.find(".team-template-image-icon img").first().attr("src")
      );
    };

    const team1Logo = getTeamLogo($leftOpponent);
    const team2Logo = getTeamLogo($rightOpponent);

    const team1Icon = team1Logo ? "https://liquipedia.net" + team1Logo : undefined;
    const team2Icon = team2Logo ? "https://liquipedia.net" + team2Logo : undefined;

    const tournament = $match.find(".match-info-tournament-name").text().replace(/\s+/g, " ").trim();

    const currentDate = new Date();
    const todayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const todayStartUnix = Math.floor(todayStart.getTime() / 1000);

    // Skip past matches (keep TBD = timestamp 0)
    if (timestampUnix !== 0 && timestampUnix < todayStartUnix) {
      return;
    }

    const streams: string[] = [];
    $match.find(".match-info-links a[href*='Special:Stream']").each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        const fullUrl = href.startsWith("http") ? href : "https://liquipedia.net" + href;
        streams.push(fullUrl);
      }
    });

    const key = `${team1}|${team2}|${timestampUnix}`;
    if (team1 && team2 && !seen.has(key)) {
      seen.add(key);
      matches.push({
        team1,
        team2,
        team1Icon,
        team2Icon,
        time: timeText,
        timestamp: timestampUnix,
        tournament,
        streams,
      });
    }
  });

  lastFetchTime = now;
  cachedData = matches;
  return matches;
}
