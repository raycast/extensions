import { List, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import Fotmob from "fotmob";
import { MatchData, MatchItem, MatchStatus } from "./types";
import { promises as fs } from "fs";
import path from "path";

const CACHE_FILE = path.join(__dirname, "matchesCache.json");
const CACHE_DURATION = 24 * 60 * 60 * 1000; // Cache duration in milliseconds (e.g., 24 hours)

async function readCache() {
  try {
    const stats = await fs.stat(CACHE_FILE);
    if (stats.mtime.getTime() + CACHE_DURATION > Date.now()) {
      const data = await fs.readFile(CACHE_FILE, "utf8");
      try {
        return JSON.parse(data);
      } catch (parseError) {
        // Check if the error is due to an empty file or unexpected end of input
        if ((parseError as Error).message.includes("Unexpected end of JSON input")) {
          // Handle the specific error silently or perform any cleanup if necessary
          return null;
        }
        console.error("Cache parsing error, treating as empty:", parseError);
        return null;
      }
    }
  } catch (error) {
    console.error("Cache read error:", error);
  }
  return null;
}

async function writeCache(data: MatchData) {
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(data), "utf8");
  } catch (error) {
    console.error("Cache write error:", error);
  }
}

async function fetchLeagueMatches() {
  const fotmob = new Fotmob();
  const interestedLeagues = {
    "9134": "189397",
    "9907": "401657",
    "9227": "258657",
  };
  const allMatches = [];
  const currentDate = new Date();
  const startDate = new Date();
  startDate.setDate(currentDate.getDate() - 7); // 7 days in the past
  const endDate = new Date();
  endDate.setDate(currentDate.getDate() + 30); // 30 days in the future

  for (const [leagueId, teamId] of Object.entries(interestedLeagues)) {
    try {
      console.log(`Fetching league data for ${leagueId}`);
      const leagueData = await fotmob.getLeague(Number(leagueId), "overview", "league", "America/New_York");

      if (leagueData && leagueData.overview && leagueData.overview.leagueOverviewMatches) {
        for (const match of leagueData.overview.leagueOverviewMatches) {
          const matchDate = match.status?.utcTime ? new Date(match.status.utcTime) : new Date();
          if (
            matchDate >= startDate &&
            matchDate <= endDate &&
            (match.home?.id === teamId || match.away?.id === teamId)
          ) {
            const isMatchCompleted = match.status?.finished ?? false;
            let winningTeam = "";
            if (isMatchCompleted) {
              if ((match.home?.score ?? 0) > (match.away?.score ?? 0)) {
                winningTeam = match.home?.name ?? "";
              } else if ((match.home?.score ?? 0) < (match.away?.score ?? 0)) {
                winningTeam = match.away?.name ?? "";
              }
            }

            allMatches.push({
              date: matchDate.toISOString().substring(0, 10).replace(/-/g, ""),
              leagueId: leagueId,
              leagueName: leagueData.details?.name ?? "",
              match,
              matchLink: `https://www.fotmob.com${match.pageUrl}`,
              winner: winningTeam,
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching league data for ${leagueId}:`, error);
    }
  }
  return allMatches;
}

function getMatchStatus(match: MatchStatus) {
  if (match.status.cancelled) {
    return "cancelled";
  } else if (match.status.finished) {
    return "finished";
  } else if (match.status.started) {
    return "in-progress";
  } else {
    return "upcoming";
  }
}

function formatMatchTime(utcTimeStr: string | number | Date) {
  const utcTime = new Date(utcTimeStr);
  const options = { hour: "numeric", minute: "2-digit", hour12: true };

  // Convert to Eastern Time (New York)
  const easternTimeFormatter = new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  });
  const easternTime = easternTimeFormatter.format(utcTime);

  // Format UTC Time
  const utcTimeFormatter = new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZone: "UTC",
    hour: "numeric",
    minute: "numeric",
  });
  const formattedUtcTime = utcTimeFormatter.format(utcTime);

  return `${easternTime} (${formattedUtcTime} UTC)`;
}

function formatDate(dateStr: string) {
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${month}/${day}/${year.substring(2)}`;
}

export default function MatchListCommand() {
  const [groupedMatches, setMatches] = useState<Record<string, MatchItem[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      let cachedData = await readCache();
      if (!cachedData) {
        cachedData = await fetchLeagueMatches();
        await writeCache(cachedData);
      }

      const groupedMatches = cachedData.reduce((acc: Record<string, MatchItem[]>, match: MatchItem) => {
        (acc[match.leagueName] = acc[match.leagueName] || []).push(match);
        return acc;
      }, {});

      setMatches(groupedMatches);
      setIsLoading(false);
    }
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <List>
        <List.EmptyView title="Loading matches..." description="Please wait while we fetch the latest matches." />
      </List>
    );
  }

  return (
    <List>
      {Object.entries(groupedMatches).map(([leagueName, matches], leagueIndex) => (
        <List.Section key={leagueIndex} title={leagueName}>
          {matches.map((match, matchIndex) => {
            const status = getMatchStatus(match.match);
            let icon = "🔜";
            let title = `${match.match.home.name} vs ${match.match.away.name}`;
            if (status === "finished") {
              icon = "✅";
              let homeTeamName = match.match.home.name;
              let awayTeamName = match.match.away.name;
              if (match.winner) {
                if (match.winner === match.match.home.name) {
                  homeTeamName = `🏆 ${homeTeamName}`;
                } else if (match.winner === match.match.away.name) {
                  awayTeamName = `🏆 ${awayTeamName}`;
                }
              }
              title = `${homeTeamName} vs ${awayTeamName} - ${match.match.home.score} - ${match.match.away.score}`;
            } else if (status === "in-progress") {
              icon = "⚽️";
            } else if (status === "cancelled") {
              icon = "❌";
            }

            const formattedTime = formatMatchTime(match.match.status.utcTime);
            const formattedDate = formatDate(match.date);
            const dateTimeText = `${formattedDate} at ${formattedTime}`;

            return (
              <List.Item
                key={matchIndex}
                icon={icon}
                title={title}
                accessories={[{ text: dateTimeText }]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={match.matchLink} title="Open Match Details" />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
