import { Cache, getPreferenceValues, List, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import Fotmob from "fotmob";
import { MatchData, MatchItem, Match, MatchStatus, Preferences } from "./types";

async function fetchLeagueMatches(): Promise<MatchData> {
  const fotmob = new Fotmob();
  const prefs = getPreferenceValues<Preferences>();

  // Convert string preferences to numbers and construct the interestedLeagues object
  const interestedLeagues = {
    [Number(prefs.league1)]: Number(prefs.team1),
    [Number(prefs.league2)]: Number(prefs.team2),
    [Number(prefs.league3)]: Number(prefs.team3),
    [Number(prefs.league4)]: Number(prefs.team4),
    [Number(prefs.league5)]: Number(prefs.team5),
  };

  // Filter out empty or invalid entries
  Object.keys(interestedLeagues).forEach((key) => {
    const leagueId = Number(key);
    const teamId = interestedLeagues[leagueId];

    if (!teamId || isNaN(leagueId) || isNaN(teamId)) {
      delete interestedLeagues[leagueId];
    }
  });

  if (Object.keys(interestedLeagues).length === 0) {
    return []; // Return an empty array if no leagues are specified
  }

  const allMatches: MatchData = [];
  const currentDate = new Date();
  const startDate = new Date();
  startDate.setDate(currentDate.getDate() - 7);
  const endDate = new Date();
  endDate.setDate(currentDate.getDate() + 30);

  for (const [leagueId, teamId] of Object.entries(interestedLeagues)) {
    try {
      console.log(`Fetching league data for ${leagueId}`);
      const leagueData = await fotmob.getLeague(Number(leagueId), "overview", "league", "America/New_York");

      if (leagueData && leagueData.overview && leagueData.overview.leagueOverviewMatches) {
        for (const match of leagueData.overview.leagueOverviewMatches) {
          if (!match.id) {
            continue;
          }

          const matchDate = match.status?.utcTime ? new Date(match.status.utcTime) : new Date();
          if (
            matchDate >= startDate &&
            matchDate <= endDate &&
            (Number(match.home?.id) === teamId || Number(match.away?.id) === teamId)
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
              date: matchDate,
              leagueId: leagueId,
              leagueName: leagueData.details?.name ?? "",
              match: match as Match,
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

function formatDateTime(utcDateTime: Date) {
  const options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: true };

  // Format date
  const formattedDate = utcDateTime.toLocaleDateString("en-US", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });

  // Convert to Eastern Time (New York)
  const easternTimeFormatter = new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZone: "America/New_York",
  });
  const easternTime = easternTimeFormatter.format(utcDateTime);

  // Format UTC Time
  const utcTimeFormatter = new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZone: "UTC",
  });
  const formattedUtcTime = utcTimeFormatter.format(utcDateTime);

  return `${formattedDate} at ${easternTime} (${formattedUtcTime} UTC)`;
}

async function cachedFetchLeagueMatches(): Promise<MatchData> {
  const cache = new Cache({ namespace: "MatchListCache", capacity: 10 * 1024 * 1024 }); // 10 MB capacity
  const cacheExpiryTime = 60 * 60 * 1000; // 1 hour in milliseconds
  const cachedData = cache.get("matches");
  const cachedTimestamp = cache.get("matchesTimestamp");

  const currentTime = Date.now();

  // Check if cached data exists and is still valid
  if (cachedData && cachedTimestamp && currentTime - parseInt(cachedTimestamp, 10) < cacheExpiryTime) {
    return JSON.parse(cachedData);
  } else {
    // Fetch new data as cache is empty or expired
    const matches = await fetchLeagueMatches();
    cache.set("matches", JSON.stringify(matches));
    cache.set("matchesTimestamp", currentTime.toString()); // Store the current time as a timestamp
    return matches;
  }
}

export default function MatchListCommand() {
  const [groupedMatches, setMatches] = useState<Record<string, MatchItem[]> | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const matches = await cachedFetchLeagueMatches();
        const grouped = matches.reduce((acc: Record<string, MatchItem[]>, match: MatchItem) => {
          (acc[match.leagueName] = acc[match.leagueName] || []).push(match);
          return acc;
        }, {});
        setMatches(grouped);
      } catch (error) {
        console.error("Error fetching matches:", error);
        setMatches({});
      }
      setIsLoading(false);
    }
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <List isLoading={true}>
        <List.EmptyView title="Loading matches..." description="Please wait while we fetch the latest matches." />
      </List>
    );
  }

  if (Object.keys(groupedMatches || {}).length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No Matches Found"
          description="No matches available for the selected leagues or teams."
        />
      </List>
    );
  }

  return (
    <List>
      {groupedMatches &&
        Object.entries(groupedMatches).map(([leagueName, matches], leagueIndex) => (
          <List.Section key={leagueIndex} title={leagueName}>
            {matches.map((match, matchIndex) => {
              const status = getMatchStatus(match.match);
              const dateTimeText = formatDateTime(new Date(match.match.status.utcTime));
              let icon = "🔜";
              let title = `${match.match.home.name} vs ${match.match.away.name}`;

              if (status === "finished") {
                icon = "✅";
                title += ` - ${match.match.home.score} - ${match.match.away.score}`;
                if (match.winner) {
                  title +=
                    match.winner === match.match.home.name
                      ? ` 🏆 ${match.match.home.name}`
                      : ` 🏆 ${match.match.away.name}`;
                }
              } else if (status === "in-progress") {
                icon = "⚽️";
              } else if (status === "cancelled") {
                icon = "❌";
              }

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
