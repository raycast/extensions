import { useEffect, useState } from "react";
import { format } from "date-fns";
import { getPreferenceValues, Cache } from "@raycast/api";
import { List } from "@raycast/api";
import type { Award, Event, Match, Rankings } from "./frc-team";
import { getMatchesTable } from "./frc-team";

const cache = new Cache();

function getCachedData<T>(key: string, ttlMinutes: number = 5): T | null {
  const cached = cache.get(key);
  const timestampKey = `${key}_timestamp`;
  const timestamp = cache.get(timestampKey);

  if (cached && timestamp) {
    try {
      const data = JSON.parse(cached) as T;
      const cacheTime = parseInt(timestamp);
      const now = Date.now();
      const ttlMs = ttlMinutes * 60 * 1000;

      // Check if cache is still valid
      if (now - cacheTime < ttlMs) {
        return data;
      } else {
        // Cache expired, remove it
        cache.remove(key);
        cache.remove(timestampKey);
      }
    } catch (error) {
      console.error(`Error parsing cached data for key ${key}:`, error);
      cache.remove(key);
      cache.remove(timestampKey);
    }
  }
  return null;
}

function setCachedData<T>(key: string, data: T): void {
  try {
    const timestampKey = `${key}_timestamp`;
    cache.set(key, JSON.stringify(data));
    cache.set(timestampKey, Date.now().toString());
  } catch (error) {
    console.error(`Error caching data for key ${key}:`, error);
  }
}

const preferences = getPreferenceValues<Preferences.FrcEvent>();
export default function Command({
  arguments: { event },
}: {
  arguments: Arguments.FrcEvent;
}) {
  const [eventData, setEventData] = useState<Event | null>(null);
  const [eventExists, setEventExists] = useState<boolean>(false);
  const [rankings, setRankings] = useState<Rankings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setIsLoading(true);
    async function fetchData() {
      try {
        // Check cache first
        const cacheKey = `event-${event}`;
        const cachedEventData = getCachedData<Event>(cacheKey);
        const cachedRankings = getCachedData<Rankings>(`rankings-${event}`);

        if (cachedEventData && cachedRankings) {
          setEventData(cachedEventData);
          setRankings(cachedRankings);
          setEventExists(true);
          setIsLoading(false);
          return;
        }

        // Fetch event data first to validate event exists
        const eventResponse = await fetch(
          `https://www.thebluealliance.com/api/v3/event/${event}`,
          {
            headers: {
              "X-TBA-Auth-Key": preferences.tbaApiKey,
            },
          }
        );
        const eventData = (await eventResponse.json()) as Partial<Event>;
        if (!eventData || typeof eventData !== "object" || !eventData.key) {
          setEventExists(false);
          setIsLoading(false);
          return;
        }

        const eventObj: Event = {
          key: eventData.key ?? "",
          name: eventData.name ?? "",
          city: eventData.city ?? "",
          state_prov: eventData.state_prov ?? "",
          start_date: eventData.start_date ?? "",
          end_date: eventData.end_date ?? "",
          country: eventData.country ?? "",
          matches: [],
          status: "",
          team_awards: [],
          gmaps_place_id: eventData.gmaps_place_id ?? "",
          gmaps_url: eventData.gmaps_url ?? "",
          gmaps_location_name: eventData.gmaps_location_name ?? "",
          awards: [],
          teams: [],
        };

        // Fetch awards, rankings, and match keys in parallel
        const [awardsResponse, rankingsResponse, matchKeysResponse] =
          await Promise.all([
            fetch(
              `https://www.thebluealliance.com/api/v3/event/${event}/awards`,
              {
                headers: { "X-TBA-Auth-Key": preferences.tbaApiKey },
              }
            ),
            fetch(
              `https://www.thebluealliance.com/api/v3/event/${event}/teams/statuses`,
              {
                headers: { "X-TBA-Auth-Key": preferences.tbaApiKey },
              }
            ),
            fetch(
              `https://www.thebluealliance.com/api/v3/event/${event}/matches/keys`,
              {
                headers: { "X-TBA-Auth-Key": preferences.tbaApiKey },
              }
            ),
          ]);

        // Process awards with more efficient array methods
        const awardsData = (await awardsResponse.json()) as Array<{
          name: string;
          recipient_list: Array<{ team_key: string }>;
        }>;
        const awards: Award[] = [];
        if (Array.isArray(awardsData)) {
          awardsData
            .filter(
              (award) =>
                award.recipient_list && Array.isArray(award.recipient_list)
            )
            .flatMap((award) =>
              award.recipient_list.map((recipient) => ({
                name: award.name,
                team: recipient.team_key,
              }))
            )
            .forEach((award) => awards.push(award));
        }
        eventObj.awards = awards;

        // Process rankings and update UI immediately
        let rankings: Rankings | null = null;
        try {
          rankings = (await rankingsResponse.json()) as Rankings;
          setRankings(rankings);
          // Update event data with awards and rankings first for progressive loading
          setEventData({ ...eventObj, awards: eventObj.awards });
        } catch (error) {
          console.error("Error fetching rankings:", error);
        }

        // Process matches
        const matchKeysData = (await matchKeysResponse.json()) as string[];
        const matches: Match[] = [];

        if (Array.isArray(matchKeysData) && matchKeysData.length > 0) {
          // Fetch all match data in parallel (batch of 10 to avoid overwhelming APIs)
          const batchSize = 10;
          for (let i = 0; i < matchKeysData.length; i += batchSize) {
            const batch = matchKeysData.slice(i, i + batchSize);
            const matchPromises = batch.map(async (matchKey) => {
              try {
                const response = await fetch(
                  `https://api.statbotics.io/v3/match/${matchKey}`
                );
                return await response.json();
              } catch (error) {
                console.error(`Error fetching match ${matchKey}:`, error);
                return null;
              }
            });

            const matchResults = await Promise.all(matchPromises);

            // Process match results with simplified validation
            const newMatches = matchResults
              .filter(
                (curMatchData) =>
                  curMatchData?.key &&
                  curMatchData.alliances?.red?.team_keys?.length >= 3 &&
                  curMatchData.alliances?.blue?.team_keys?.length >= 3 &&
                  curMatchData.result &&
                  curMatchData.pred
              )
              .map((curMatchData) => {
                const { alliances, result, pred } = curMatchData;
                return {
                  key: curMatchData.key,
                  red1: alliances.red.team_keys[0],
                  red2: alliances.red.team_keys[1],
                  red3: alliances.red.team_keys[2],
                  blue1: alliances.blue.team_keys[0],
                  blue2: alliances.blue.team_keys[1],
                  blue3: alliances.blue.team_keys[2],
                  scoreBlue: result.blue_score,
                  scoreRed: result.red_score,
                  predBlue: Math.round(pred.blue_score),
                  predRed: Math.round(pred.red_score),
                } as Match;
              });

            matches.push(...newMatches);

            // Progressive loading: update UI with matches as they're processed
            if (newMatches.length > 0) {
              setEventData({ ...eventObj, matches: [...matches] });
            }
          }
        }

        eventObj.matches = matches;
        setEventData(eventObj);
        setEventExists(true);

        // Cache the results
        setCachedData(cacheKey, eventObj);
        if (rankings) {
          setCachedData(`rankings-${event}`, rankings);
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching event data:", error);
        setIsLoading(false);
      }
    }
    fetchData();
  }, [event]);

  if (!eventExists) {
    return (
      <List isShowingDetail={true} filtering={false} isLoading={false}>
        <List.EmptyView
          title="Invalid Event ID"
          description="The event ID you provided is not valid. Please check the event ID and try again."
        />
      </List>
    );
  }

  return (
    <List isShowingDetail={true} filtering={false} isLoading={isLoading}>
      {!isLoading && eventData && (
        <>
          <List.Item
            title={eventData.name}
            detail={
              <List.Item.Detail
                markdown={`# ${eventData.name}

**Location:** [${eventData.city}, ${eventData.state_prov}, ${eventData.country}](${eventData.gmaps_url})

**Dates:** ${format(new Date(eventData.start_date), "MMMM do, yyyy")} to ${format(new Date(eventData.end_date), "MMMM do, yyyy")}

(${eventData.key}) - [View on TBA](https://www.thebluealliance.com/event/${eventData.key}) / [View on Statbotics](https://api.statbotics.io/v3/event/${eventData.key})

`}
              />
            }
            subtitle={`${eventData.city}, ${eventData.state_prov}, ${eventData.country}`}
          />

          <List.Item
            title="Matches"
            detail={<List.Item.Detail markdown={getMatchesTable(eventData)} />}
          />

          <List.Item
            title="Awards"
            detail={
              <List.Item.Detail
                markdown={awardsToMarkdown(eventData.awards, eventData)}
              />
            }
          />
          {rankings && (
            <List.Item
              title="Rankings"
              detail={
                <List.Item.Detail markdown={rankingsToMarkdown(rankings)} />
              }
            />
          )}
        </>
      )}
    </List>
  );
}

function rankingsToMarkdown(rankings: Rankings): string {
  if (!rankings || Object.keys(rankings).length === 0)
    return "No rankings found.";
  let md =
    "| Team | Rank | Record | Alliance | Playoff |\n|------|------|--------|----------|---------|\n";
  const rankingArr = Object.entries(rankings)
    .map(([teamKey, team]) => {
      if (!team || !team.qual || !team.qual.ranking) {
        return {
          teamKey,
          rank: Infinity,
          record: "0-0-0",
          allianceStatus: "",
          playoff: "",
        };
      }
      const qual = team.qual.ranking;
      return {
        teamKey,
        rank: typeof qual.rank === "number" ? qual.rank : "",
        record:
          qual &&
          qual.record &&
          typeof qual.record.wins === "number" &&
          typeof qual.record.losses === "number" &&
          typeof qual.record.ties === "number"
            ? `${qual.record.wins}-${qual.record.losses}-${qual.record.ties}`
            : "",
        allianceStatus:
          team.alliance_status_str &&
          typeof team.alliance_status_str === "string"
            ? team.alliance_status_str.replace(/<[^>]+>/g, "")
            : "",
        playoff:
          team.playoff_status_str && typeof team.playoff_status_str === "string"
            ? team.playoff_status_str.replace(/<[^>]+>/g, "")
            : "",
      };
    })
    .sort((a, b) => {
      const rankA = typeof a.rank === "number" ? a.rank : Infinity;
      const rankB = typeof b.rank === "number" ? b.rank : Infinity;
      return rankA - rankB;
    });
  for (const row of rankingArr) {
    md += `| ${typeof row.teamKey === "string" ? row.teamKey.replace(/^frc/, "") : row.teamKey} | ${row.rank === Infinity ? "" : row.rank} | ${row.record} | ${row.allianceStatus} | ${row.playoff} |\n`;
  }
  return md;
}

function awardsToMarkdown(awards: Award[], event: Event): string {
  if (event.start_date > new Date().toISOString()) {
    return "Event has not started yet.";
  }
  if (!awards || awards.length === 0) {
    return "No awards found.";
  }
  return (
    "| Award | Winner |\n|-------|------|\n" +
    awards
      .map(
        (award) =>
          `| **${award.name}** | ${award.team && typeof award.team === "string" ? award.team.replace(/^frc/, "") : award.team} |`
      )
      .join("\n")
  );
}
