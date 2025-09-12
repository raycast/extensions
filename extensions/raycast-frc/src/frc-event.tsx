import { useEffect, useState } from "react";
import { format } from "date-fns";
import { getPreferenceValues } from "@raycast/api";
import { List } from "@raycast/api";
import type { Award, Event, Match, Rankings } from "./frc-team";
import { getMatchesTable } from "./frc-team";

const preferences = getPreferenceValues<Preferences.FrcEvent>();
export default function Command({
  arguments: { event },
}: {
  arguments: Arguments.FrcEvent;
}) {
  const [eventData, setEventData] = useState<Event | null>(null);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [eventExists, setEventExists] = useState<boolean>(true);
  const [rankings, setRankings] = useState<Rankings | null>(null);

  useEffect(() => {
    setMarkdown("# Loading...");
    async function fetchData() {
      try {
        const response = await fetch(
          `https://www.thebluealliance.com/api/v3/event/${event}`,
          {
            headers: {
              "X-TBA-Auth-Key": preferences.tbaApiKey,
            },
          },
        );
        const data = (await response.json()) as Partial<Event>;
        if (!data || typeof data !== "object" || !data.key) {
          setMarkdown("# Invalid Event ID");
          setEventExists(false);
          return;
        }
        setMarkdown(data.name ?? "");
        const eventData: Event = {
          key: data.key ?? "",
          name: data.name ?? "",
          city: data.city ?? "",
          state_prov: data.state_prov ?? "",
          start_date: data.start_date ?? "",
          end_date: data.end_date ?? "",
          country: data.country ?? "",
          matches: [],
          status: "",
          team_awards: [],
          gmaps_place_id: data.gmaps_place_id ?? "",
          gmaps_url: data.gmaps_url ?? "",
          gmaps_location_name: data.gmaps_location_name ?? "",
          awards: [],
          teams: [],
        };
        setEventData(eventData);
        const awardsResponse = await fetch(
          `https://www.thebluealliance.com/api/v3/event/${event}/awards`,
          {
            headers: {
              "X-TBA-Auth-Key": preferences.tbaApiKey,
            },
          },
        );
        const awardsData = (await awardsResponse.json()) as Array<{
          name: string;
          recipient_list: Array<{ team_key: string }>;
        }>;
        const awards: Award[] = [];
        if (awardsData && Array.isArray(awardsData)) {
          for (const award of awardsData) {
            if (award.recipient_list && Array.isArray(award.recipient_list)) {
              for (const recipient of award.recipient_list) {
                awards.push({
                  name: award.name,
                  team: recipient.team_key,
                });
              }
            }
          }
        }
        eventData.awards = awards;
        setEventData(eventData);

        try {
          const rankingsResponse = await fetch(
            `https://www.thebluealliance.com/api/v3/event/${event}/teams/statuses`,
            {
              headers: {
                "X-TBA-Auth-Key": preferences.tbaApiKey,
              },
            },
          );
          const rankingsData = (await rankingsResponse.json()) as Rankings;
          setRankings(rankingsData);
        } catch (error) {
          console.error("Error fetching rankings:", error);
        }
        const matchList = await fetch(
          `https://www.thebluealliance.com/api/v3/event/${event}/matches/keys`,
          {
            headers: {
              "X-TBA-Auth-Key": preferences.tbaApiKey,
            },
          },
        );
        const matchListData = (await matchList.json()) as string[];
        const matches: Match[] = [];
        if (Array.isArray(matchListData) && matchListData.length > 0) {
          for (const matchKey of matchListData) {
            const curMatch = await fetch(
              `https://api.statbotics.io/v3/match/${matchKey}`,
            );
            const curMatchData = (await curMatch.json()) as {
              key: string;
              alliances: {
                red: { team_keys: string[] };
                blue: { team_keys: string[] };
              };
              result: { blue_score: number; red_score: number };
              pred: { blue_score: number; red_score: number };
            };
            if (
              curMatchData &&
              curMatchData.key &&
              curMatchData.alliances &&
              curMatchData.alliances.red &&
              curMatchData.alliances.blue &&
              Array.isArray(curMatchData.alliances.red.team_keys) &&
              Array.isArray(curMatchData.alliances.blue.team_keys) &&
              curMatchData.alliances.red.team_keys.length >= 3 &&
              curMatchData.alliances.blue.team_keys.length >= 3 &&
              curMatchData.result &&
              curMatchData.pred
            ) {
              const matchData: Match = {
                key: curMatchData.key,
                red1: curMatchData.alliances.red.team_keys[0],
                red2: curMatchData.alliances.red.team_keys[1],
                red3: curMatchData.alliances.red.team_keys[2],
                blue1: curMatchData.alliances.blue.team_keys[0],
                blue2: curMatchData.alliances.blue.team_keys[1],
                blue3: curMatchData.alliances.blue.team_keys[2],
                scoreBlue: curMatchData.result.blue_score,
                scoreRed: curMatchData.result.red_score,
                predBlue: Math.round(curMatchData.pred.blue_score),
                predRed: Math.round(curMatchData.pred.red_score),
              };
              matches.push(matchData);
            }
          }
        }
        eventData.matches = matches;
        setEventData(eventData);
      } catch (error) {
        console.error("Error fetching event data:", error);
      }
    }
    fetchData();
  }, [event]);

  return (
    <List isShowingDetail={true} filtering={false}>
      <List.Item
        title={eventData ? eventData.name : "Event"}
        detail={
          <List.Item.Detail
            markdown={
              eventData
                ? `# ${eventData.name}

**Location:** [${eventData.city}, ${eventData.state_prov}, ${eventData.country}](${eventData.gmaps_url})

**Dates:** ${format(new Date(eventData.start_date), "MMMM do, yyyy")} to ${format(new Date(eventData.end_date), "MMMM do, yyyy")}

(${eventData.key}) - [View on TBA](https://www.thebluealliance.com/event/${eventData.key}) / [View on Statbotics](https://api.statbotics.io/v3/event/${eventData.key})

`
                : (markdown ?? "Loading...")
            }
          />
        }
        subtitle={
          eventData
            ? `${eventData.city}, ${eventData.state_prov}, ${eventData.country}`
            : ""
        }
      />
      {eventExists && (
        <>
          {eventData ? (
            <List.Item
              title="Matches"
              detail={
                <List.Item.Detail markdown={getMatchesTable(eventData)} />
              }
            />
          ) : (
            <List.Item title="Loading Matches..." />
          )}

          {eventData ? (
            <List.Item
              title="Awards"
              detail={
                <List.Item.Detail
                  markdown={awardsToMarkdown(eventData.awards, eventData)}
                />
              }
            />
          ) : (
            <List.Item title="Loading Awards..." />
          )}
          {rankings ? (
            <List.Item
              title="Rankings"
              detail={
                <List.Item.Detail markdown={rankingsToMarkdown(rankings)} />
              }
            />
          ) : (
            <List.Item title="Loading Rankings..." />
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
          `| **${award.name}** | ${award.team && typeof award.team === "string" ? award.team.replace(/^frc/, "") : award.team} |`,
      )
      .join("\n")
  );
}
