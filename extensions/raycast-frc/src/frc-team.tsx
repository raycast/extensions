import { Action, ActionPanel, Detail, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { getPreferenceValues } from "@raycast/api";

export interface TeamStatus {
  qual?: {
    ranking?: {
      rank?: number;
      record: { wins: number; losses: number; ties: number };
    };
  };
  alliance_status_str?: string;
  playoff_status_str?: string;
}

export type Rankings = Record<string, TeamStatus>;

export interface Award {
  name: string;
  team: string;
}

export interface Event {
  key: string;
  name: string;
  city: string;
  state_prov: string;
  start_date: string;
  end_date: string;
  country: string;
  matches: Match[];
  status: string;
  team_awards: string[];
  gmaps_place_id: string;
  gmaps_url: string;
  gmaps_location_name: string;
  awards: Award[];
  teams: string[];
}
export interface Match {
  key: string;
  red1: string;
  red2: string;
  red3: string;
  blue1: string;
  blue2: string;
  blue3: string;
  scoreBlue: number;
  scoreRed: number;
  predBlue: number;
  predRed: number;
}

interface TeamData {
  nickname: string;
  city: string;
  state_prov: string;
  country: string;
  district: string;
  epa: number;
  wins: number;
  losses: number;
  ties: number;
  competing: boolean;
  district_points: number;
  district_rank: number;
  events: Event[];
}

function getDistrictName(code: string): string | null {
  const districtMap: { [key: string]: string } = {
    ONT: "FIRST Canada - Ontario",
    FMA: "FIRST Mid-Atlantic",
    ISR: "FIRST Israel",
    CHS: "FIRST Chesapeake",
    FIT: "FIRST In Texas",
    PCH: "Peachtree",
    PNW: "Pacific Northwest",
    FIM: "FIRST in Michigan",
    FSC: "FIRST South Carolina",
    FNC: "FIRST North Carolina",
    FIN: "FIRST Indiana Robotics",
    NE: "New England",
  };
  return districtMap[code.toUpperCase()] || null;
}

const preferences = getPreferenceValues<Preferences.FrcEvent>();

export default function Command({
  arguments: { team, year: yearArg },
}: {
  arguments: Arguments.FrcTeam;
}) {
  if (!team || isNaN(Number(team))) {
    console.log(Number(team));
    return <Detail markdown="# Invalid Team Number" />;
  }
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [teamExists, setTeamExists] = useState<boolean>(true);
  const year =
    yearArg && !isNaN(Number(yearArg))
      ? Number(yearArg)
      : new Date().getFullYear();

  const markdown = `
# Team ${team}${teamData ? ` - ${teamData.nickname}` : ""}  
<img src="https://www.thebluealliance.com/avatar/${year}/frc${team}.png" width="40" />
From ${teamData ? `${teamData.city}, ${teamData.state_prov}, ${teamData.country}` : ""} 

${
  teamData && teamData.epa
    ? `**Record:** ${teamData ? `${teamData.wins}-${teamData.losses}-${teamData.ties}` : "N/A"}  

**EPA:** ${teamData?.epa ?? "N/A"}`
    : ""
}

${teamData?.district ? `As a member of the ${getDistrictName(teamData.district)} district, Team ${team} ranked #${teamData.district_rank} having earned ${teamData.district_points} points.` : ""}

[View on TBA](https://www.thebluealliance.com/team/${team}) / [View on Statbotics](https://api.statbotics.io/v3/team_year/${team}/)`;

  useEffect(() => {
    async function fetchData() {
      try {
        const tbaResponse = await fetch(
          `https://www.thebluealliance.com/api/v3/team/frc${team}`,
          {
            headers: {
              "X-TBA-Auth-Key": preferences.tbaApiKey,
            },
          },
        );
        const tbaData = (await tbaResponse.json()) as Partial<TeamData>;
        if (!tbaData || !tbaData.nickname) {
          setTeamExists(false);
          return;
        }
        setTeamData({
          nickname: tbaData.nickname ?? "",
          city: tbaData.city ?? "",
          state_prov: tbaData.state_prov ?? "",
          country: tbaData.country ?? "",
          district: "",
          epa: 0,
          wins: 0,
          losses: 0,
          ties: 0,
          competing: false,
          district_points: 0,
          district_rank: 0,
          events: [],
        });
        const statboticsResponse = await fetch(
          `https://api.statbotics.io/v3/team_year/${team}/${year}`,
        );
        type StatboticsData = {
          district?: string;
          epa?: { total_points?: { mean?: number } };
          record?: { wins?: number; losses?: number; ties?: number };
          district_points?: number;
          district_rank?: number;
        };
        const statboticsData =
          (await statboticsResponse.json()) as StatboticsData;

        const eventListResponse = await fetch(
          `https://www.thebluealliance.com/api/v3/team/frc${team}/events/${year}`,
          {
            headers: {
              "X-TBA-Auth-Key": preferences.tbaApiKey,
            },
          },
        );
        const eventListRaw = (await eventListResponse.json()) as Event[];
        let processedTeamData: TeamData = {
          nickname: tbaData.nickname ?? "",
          city: tbaData.city ?? "",
          state_prov: tbaData.state_prov ?? "",
          country: tbaData.country ?? "",
          district: statboticsData?.district ?? "",
          epa: statboticsData?.epa?.total_points?.mean || 0,
          wins: statboticsData?.record?.wins || 0,
          losses: statboticsData?.record?.losses || 0,
          ties: statboticsData?.record?.ties || 0,
          competing: false,
          district_points: statboticsData?.district_points || 0,
          district_rank: statboticsData?.district_rank || 0,
          events: [],
        };
        setTeamData(processedTeamData);

        const events: Event[] = Array.isArray(eventListRaw)
          ? eventListRaw.map((event) => ({
              key: event.key ?? "",
              name: event.name ?? "",
              city: event.city ?? "",
              state_prov: event.state_prov ?? "",
              country: event.country ?? "",
              start_date: event.start_date ?? "",
              end_date: event.end_date ?? "",
              gmaps_place_id: event.gmaps_place_id ?? "",
              gmaps_url: event.gmaps_url ?? "",
              matches: [],
              status: "",
              team_awards: [],
              gmaps_location_name: "",
              awards: [],
              teams: [],
            }))
          : [];
        for (const event of events) {
          const eventStatus = await fetch(
            `https://www.thebluealliance.com/api/v3/team/frc${team}/event/${event.key}/status`,
            {
              headers: {
                "X-TBA-Auth-Key": preferences.tbaApiKey,
              },
            },
          );

          type EventStatusData = { overall_status_str?: string };
          const eventStatusData = (await eventStatus.json()) as EventStatusData;
          const eventAwards = await fetch(
            `https://www.thebluealliance.com/api/v3/team/frc${team}/event/${event.key}/awards`,
            {
              headers: {
                "X-TBA-Auth-Key": preferences.tbaApiKey,
              },
            },
          );
          const eventAwardsData = (await eventAwards.json()) as Award[];

          if (Array.isArray(eventAwardsData)) {
            event.team_awards =
              eventAwardsData.map((award: { name: string }) => award.name) ||
              [];
          }
          if (eventStatusData && typeof eventStatusData === "object") {
            event.status = eventStatusData.overall_status_str || "";
          }

          const matchList = await fetch(
            `https://www.thebluealliance.com/api/v3/team/frc${team}/event/${event.key}/matches/keys`,
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
              type Alliance = { team_keys: string[] };
              type MatchResult = { blue_score: number; red_score: number };
              type MatchPred = { blue_score: number; red_score: number };
              type CurMatchData = {
                key: string;
                alliances: { red: Alliance; blue: Alliance };
                result: MatchResult;
                pred: MatchPred;
              };
              const curMatchData = (await curMatch.json()) as CurMatchData;
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
          event.matches = matches;
          processedTeamData = {
            nickname: tbaData.nickname ?? "",
            city: tbaData.city ?? "",
            state_prov: tbaData.state_prov ?? "",
            country: tbaData.country ?? "",
            district: statboticsData?.district ?? "",
            epa: statboticsData?.epa?.total_points?.mean || 0,
            wins: statboticsData?.record?.wins || 0,
            losses: statboticsData?.record?.losses || 0,
            ties: statboticsData?.record?.ties || 0,
            competing: false,
            district_points: statboticsData?.district_points || 0,
            district_rank: statboticsData?.district_rank || 0,
            events,
          };
          setTeamData(processedTeamData);
        }
        processedTeamData = {
          nickname: tbaData.nickname ?? "",
          city: tbaData.city ?? "",
          state_prov: tbaData.state_prov ?? "",
          country: tbaData.country ?? "",
          district: statboticsData?.district ?? "",
          epa: statboticsData?.epa?.total_points?.mean || 0,
          wins: statboticsData?.record?.wins || 0,
          losses: statboticsData?.record?.losses || 0,
          ties: statboticsData?.record?.ties || 0,
          competing: false,
          district_points: statboticsData?.district_points || 0,
          district_rank: statboticsData?.district_rank || 0,
          events,
        };
        setTeamData(processedTeamData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    fetchData();
  }, [team]);

  return (
    <>
      {teamExists ? (
        <List isShowingDetail={true} filtering={false}>
          {teamData ? (
            <>
              <List.Item
                title={`Team ${team}`}
                detail={<List.Item.Detail markdown={markdown} />}
                subtitle={teamData?.epa ? `EPA: ${teamData.epa}` : ""}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      url={`https://statbotics.io/team/${team}`}
                      title="Open Statbotics"
                    />
                  </ActionPanel>
                }
              />
              {teamData.events && teamData.events.length > 0 ? (
                <List.Section title="Events">
                  {teamData.events.map((event, index) => (
                    <List.Item
                      key={index}
                      title={event.name}
                      subtitle={`${event.city}, ${event.state_prov}`}
                      actions={
                        <ActionPanel>
                          <Action.OpenInBrowser
                            url={`https://statbotics.io/event/${event.key}`}
                            title="Open Statbotics"
                          />
                        </ActionPanel>
                      }
                      detail={
                        <List.Item.Detail
                          markdown={`
# ${event.name}

[${event.city}, ${event.state_prov}, ${event.country}](${event.gmaps_url})

(${event.key}) - [View on TBA](https://www.thebluealliance.com/event/${event.key}) / [View on Statbotics](https://api.statbotics.io/v3/event/${event.key})

${htmlToMarkdown(event.status)}

${event.team_awards?.length > 0 ? "They also won the following awards:\n * " + event.team_awards.join("\n * ") : ""}

${getMatchesTable(event)}
                        `}
                        />
                      }
                    />
                  ))}
                </List.Section>
              ) : (
                <List.Section title="Events">
                  <List.Item title="Loading..." />
                </List.Section>
              )}
            </>
          ) : (
            <List.Item title={`Team ${team}`} subtitle="Loading..." />
          )}
        </List>
      ) : (
        <Detail markdown="# Invalid Team Number" />
      )}
    </>
  );
}

export function htmlToMarkdown(html: string): string {
  if (!html) return "";
  let md = html;
  md = md.replace(/<b>(.*?)<\/b>/gi, "**$1**");
  md = md.replace(/<strong>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<i>(.*?)<\/i>/gi, "*$1*");
  md = md.replace(/<em>(.*?)<\/em>/gi, "*$1*");
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<[^>]+>/g, "");
  return md.trim();
}

export function getMatchesTable(event: Event): string {
  const matches = event.matches;
  if (event.start_date > new Date().toISOString()) {
    return "Event has not started yet.";
  }
  if (!matches || matches.length === 0) return "Matches Loading...";
  let table = "";
  let semifinals_header = "";
  let finals_header = "";
  const qms = matches.filter((m) =>
    m.key.replace(/^[^_]+_/, "").startsWith("qm"),
  );
  qms.sort((a, b) => {
    const aNum = parseInt(a.key.replace(/^[^_]+_qm/, ""));
    const bNum = parseInt(b.key.replace(/^[^_]+_qm/, ""));
    return aNum - bNum;
  });
  if (qms.length > 0) {
    table +=
      "**Qualifications** \n| Match | Red | Blue | Pred Red | Pred Blue | Red | Blue |\n| --- | --- | --- | --- | --- | --- | --- |\n";
    for (const match of qms) {
      const trimmedKey = match.key.replace(/^[^_]+_/, "");
      const qmMatch = trimmedKey.match(/^qm(\d+)/);
      const matchName = qmMatch ? `Quals ${qmMatch[1]}` : trimmedKey;
      table += `| [${matchName}](https://statbotics.io/match/${match.key}) | [${match.red1}](https://statbotics.io/team/${match.red1}), [${match.red2}](https://statbotics.io/team/${match.red2}), [${match.red3}](https://statbotics.io/team/${match.red3}) | [${match.blue1}](https://statbotics.io/team/${match.blue1}), [${match.blue2}](https://statbotics.io/team/${match.blue2}), [${match.blue3}](https://statbotics.io/team/${match.blue3}) | ${match.predRed > match.predBlue ? `**${match.predRed}**` : match.predRed} | ${match.predBlue > match.predRed ? `**${match.predBlue}**` : match.predBlue} | ${match.scoreRed > match.scoreBlue ? `**${match.scoreRed}**` : match.scoreRed} | ${match.scoreBlue > match.scoreRed ? `**${match.scoreBlue}**` : match.scoreBlue} |\n`;
    }
  }
  const sfs = matches.filter((m) =>
    m.key.replace(/^[^_]+_/, "").startsWith("sf"),
  );
  sfs.sort((a, b) => {
    const aTrim = a.key.replace(/^[^_]+_/, "");
    const bTrim = b.key.replace(/^[^_]+_/, "");
    const aChar = aTrim[2];
    const bChar = bTrim[2];
    if (aChar < bChar) return -1;
    if (aChar > bChar) return 1;
    return 0;
  });
  if (sfs.length > 0) {
    semifinals_header =
      "\n **Semifinals** \n| Match | Red | Blue | Pred Red | Pred Blue | Red | Blue |\n| --- | --- | --- | --- | --- | --- | --- |\n";
    table += semifinals_header;
    for (const match of sfs) {
      const trimmedKey = match.key.replace(/^[^_]+_/, "");
      const sfMatch = trimmedKey.match(/^sf\d+m(\d+)/);
      const matchName = sfMatch ? `Match ${trimmedKey[2]}` : trimmedKey;
      table += `| [${matchName}](https://statbotics.io/match/${match.key}) | [${match.red1}](https://statbotics.io/team/${match.red1}), [${match.red2}](https://statbotics.io/team/${match.red2}), [${match.red3}](https://statbotics.io/team/${match.red3}) | [${match.blue1}](https://statbotics.io/team/${match.blue1}), [${match.blue2}](https://statbotics.io/team/${match.blue2}), [${match.blue3}](https://statbotics.io/team/${match.blue3}) | ${match.predRed > match.predBlue ? `**${match.predRed}**` : match.predRed} | ${match.predBlue > match.predRed ? `**${match.predBlue}**` : match.predBlue} | ${match.scoreRed > match.scoreBlue ? `**${match.scoreRed}**` : match.scoreRed} | ${match.scoreBlue > match.scoreRed ? `**${match.scoreBlue}**` : match.scoreBlue} |\n`;
    }
  }
  const finals = matches.filter((m) =>
    m.key.replace(/^[^_]+_/, "").startsWith("f"),
  );
  finals.sort((a, b) => {
    const aTrim = a.key.replace(/^[^_]+_/, "");
    const bTrim = b.key.replace(/^[^_]+_/, "");
    const aMatch = aTrim.match(/^f(\d+)m(\d+)/);
    const bMatch = bTrim.match(/^f(\d+)m(\d+)/);
    if (aMatch && bMatch) {
      const aNum = parseInt(aMatch[2]);
      const bNum = parseInt(bMatch[2]);
      return aNum - bNum;
    }
    return aTrim.localeCompare(bTrim);
  });
  if (finals.length > 0) {
    finals_header =
      "\n **Finals** \n| Match | Red | Blue | Pred Red | Pred Blue | Red | Blue |\n| --- | --- | --- | --- | --- | --- | --- |\n";
    table += finals_header;
    for (const match of finals) {
      const trimmedKey = match.key.replace(/^[^_]+_/, "");
      const fMatch = trimmedKey.match(/^f\d+m(\d+)/);
      const matchName = fMatch ? `Finals ${fMatch[1]}` : trimmedKey;
      table += `| [${matchName}](https://statbotics.io/match/${match.key}) | [${match.red1}](https://statbotics.io/team/${match.red1}), [${match.red2}](https://statbotics.io/team/${match.red2}), [${match.red3}](https://statbotics.io/team/${match.red3}) | [${match.blue1}](https://statbotics.io/team/${match.blue1}), [${match.blue2}](https://statbotics.io/team/${match.blue2}), [${match.blue3}](https://statbotics.io/team/${match.blue3}) | ${match.predRed > match.predBlue ? `**${match.predRed}**` : match.predRed} | ${match.predBlue > match.predRed ? `**${match.predBlue}**` : match.predBlue} | ${match.scoreRed > match.scoreBlue ? `**${match.scoreRed}**` : match.scoreRed} | ${match.scoreBlue > match.scoreRed ? `**${match.scoreBlue}**` : match.scoreBlue} |\n`;
    }
  }
  return table;
}
