import { useEffect, useState } from "react";
import { format } from "date-fns";
import { getPreferenceValues } from "@raycast/api";
import { List } from "@raycast/api";
import type { Award, Event, Match, Rankings } from "./frc-team";
import { getMatchesTable } from "./frc-team";

interface Arguments {
  event: string;
}

const preferences = getPreferenceValues<{ tbaApiKey: string }>();

export default function Command({ arguments: { event } }: { arguments: Arguments }) {
  const [eventData, setEventData] = useState<Event | null>(null);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [rankings, setRankings] = useState<Rankings | null>(null);

  useEffect(() => {
    setMarkdown("# Loading...");
    async function fetchData() {
      try {
        const response = await fetch(`https://www.thebluealliance.com/api/v3/event/${event}`, {
          headers: {
            "X-TBA-Auth-Key": preferences.tbaApiKey,
          },
        });
        const data = await response.json();
        if (!data || !data.key) {
          setMarkdown("# Invalid Event ID");
          throw new Error("Invalid event data received");
        }
        setMarkdown(data.name);
        const eventData: Event = data;
        setEventData(eventData);
        const awardsResponse = await fetch(`https://www.thebluealliance.com/api/v3/event/${event}/awards`, {
          headers: {
            "X-TBA-Auth-Key": preferences.tbaApiKey,
          },
        });
        const awardsData = await awardsResponse.json();
        const awards: Award[] = [];
        if (awardsData && Array.isArray(awardsData)) {
          for (const award of awardsData) {
            for (const recipient of award.recipient_list) {
              awards.push({
                name: award.name,
                team: recipient.team_key,
              });
            }
          }
        }
        eventData.awards = awards;
        setEventData(eventData);

        try {
          const rankingsResponse = await fetch(`https://www.thebluealliance.com/api/v3/event/${event}/teams/statuses`, {
            headers: {
              "X-TBA-Auth-Key": preferences.tbaApiKey,
            },
          });
          const rankingsData: Rankings = await rankingsResponse.json();
          setRankings(rankingsData);
        } catch (error) {
          console.error("Error fetching rankings:", error);
        }
        const matchList = await fetch(`https://www.thebluealliance.com/api/v3/event/${event}/matches/keys`, {
          headers: {
            "X-TBA-Auth-Key": preferences.tbaApiKey,
          },
        });
        const matchListData = await matchList.json();
        const matches: Match[] = [];
        if (matchListData.length > 0) {
          for (const matchKey of matchListData) {
            const curMatch = await fetch(`https://api.statbotics.io/v3/match/${matchKey}`);
            const curMatchData = await curMatch.json();
            if (curMatchData) {
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
        subtitle={eventData ? `${eventData.city}, ${eventData.state_prov}, ${eventData.country}` : ""}
      />
      {eventData && eventData.matches && eventData.matches.length > 0 ? (
        <List.Item title="Matches" detail={<List.Item.Detail markdown={getMatchesTable(eventData)} />} />
      ) : (
        <List.Item title="Loading Matches..." />
      )}

      {eventData && eventData.awards && eventData.awards.length > 0 ? (
        <List.Item title="Awards" detail={<List.Item.Detail markdown={awardsToMarkdown(eventData.awards)} />} />
      ) : (
        <List.Item title="Loading Awards..." />
      )}
      {rankings ? (
        <List.Item title="Rankings" detail={<List.Item.Detail markdown={rankingsToMarkdown(rankings)} />} />
      ) : (
        <List.Item title="Loading Rankings..." />
      )}
    </List>
  );
}

function rankingsToMarkdown(rankings: Rankings): string {
  if (!rankings || Object.keys(rankings).length === 0) return "No rankings found.";
  let md = "| Team | Rank | Record | Alliance | Playoff |\n|------|------|--------|----------|---------|\n";
  const rankingArr = Object.entries(rankings)
    .map(([teamKey, team]) => {
      const qual = team.qual?.ranking;
      return {
        teamKey,
        rank: qual?.rank ?? Infinity,
        record: qual ? `${qual.record.wins}-${qual.record.losses}-${qual.record.ties}` : "",
        allianceStatus:
          team.alliance_status_str && typeof team.alliance_status_str === "string"
            ? team.alliance_status_str.replace(/<[^>]+>/g, "")
            : "",
        playoff:
          team.playoff_status_str && typeof team.playoff_status_str === "string"
            ? team.playoff_status_str.replace(/<[^>]+>/g, "")
            : "",
      };
    })
    .sort((a, b) => a.rank - b.rank);
  for (const row of rankingArr) {
    md += `| ${typeof row.teamKey === "string" ? row.teamKey.replace(/^frc/, "") : row.teamKey} | ${row.rank === Infinity ? "" : row.rank} | ${row.record} | ${row.allianceStatus} | ${row.playoff} |\n`;
  }
  return md;
}

function awardsToMarkdown(awards: Award[]): string {
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
