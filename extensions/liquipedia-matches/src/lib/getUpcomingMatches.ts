import * as cheerio from "cheerio";
import { getPreferenceValues } from "@raycast/api";
// Assuming 'fetch' is available globally or polyfilled (common in environments like Node 18+ or browsers)
// If not, you might need 'node-fetch' and its types: `import fetch from 'node-fetch';`

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

// --- Define the interface for the API response ---
interface LiquipediaApiResponse {
  parse: {
    text: {
      "*": string;
    };
  };
}
// --- End of interface definition ---

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
    console.log("Returning cached data"); // Added for clarity
    return cachedData;
  }
  // Simplified rate limit check - just check cache duration
  // A more robust check might involve tracking actual request times
  // if (now - lastFetchTime < 30000) {
  //   console.warn("Respecting Liquipedia rate limits (within cache duration)");
  // }

  const apiUrl = "https://liquipedia.net/counterstrike/api.php?action=parse&page=Liquipedia:Matches&format=json";

  console.log("Fetching fresh data from Liquipedia..."); // Added for clarity
  const res = await fetch(apiUrl, {
    headers: headers,
  });

  if (!res.ok) {
    // Log more details on failure
    const errorBody = await res.text().catch(() => "Could not read error body");
    console.error(`Failed to fetch matches: ${res.status} ${res.statusText}`, errorBody);
    throw new Error(`Failed to fetch matches: ${res.status} ${res.statusText}`);
  }

  // --- Apply the type assertion here ---
  const responseData = (await res.json()) as LiquipediaApiResponse;
  const { parse } = responseData;
  // --- End of fix ---

  if (!parse || !parse.text || typeof parse.text["*"] !== "string") {
    // Add a check to ensure the structure is as expected after the assertion
    console.error("Unexpected API response structure:", responseData);
    throw new Error("Received unexpected data structure from Liquipedia API.");
  }

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

    // Convert Unix timestamp (seconds) to milliseconds
    const timestamp = timestampAttr ? parseInt(timestampAttr, 10) * 1000 : 0;
    console.log("Timestamp in milliseconds:", timestamp);

    // Debug date conversions
    const matchDate = new Date(timestamp);
    console.log("Match date object:", matchDate);
    console.log("Match date ISO:", matchDate.toISOString());
    console.log("Match date Local:", matchDate.toString());

    // Format the time string
    let timeText = "";
    if (timestamp > 0) {
      const date = new Date(timestamp);
      timeText = date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false, // Use 24-hour format
      });
    } else {
      timeText = timerEl.text().replace(/\s+/g, " ").trim();
    }

    // Rest of your existing code...
    const team1Logo = $table.find(".team-left img").attr("src");
    const team2Logo = $table.find(".team-right img").attr("src");

    const team1Icon = team1Logo ? "https://liquipedia.net" + team1Logo : undefined;
    const team2Icon = team2Logo ? "https://liquipedia.net" + team2Logo : undefined;

    // Current date check
    const currentDate = new Date();
    const todayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const todayStartMs = todayStart.getTime();

    // Skip if timestamp is invalid or match is from the past
    if (timestamp === 0 || timestamp < todayStartMs) {
      return;
    }

    const streams: string[] = [];
    $table.find("a[href*='/counterstrike/Special:Stream/']").each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        const fullUrl = href.startsWith("http") ? href : "https://liquipedia.net" + href;
        streams.push(fullUrl);
      }
    });

    const key = `${team1}|${team2}|${timestamp}`;
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

  console.log(`Workspaceed ${matches.length} upcoming matches.`); // Added for clarity
  return matches;
}
