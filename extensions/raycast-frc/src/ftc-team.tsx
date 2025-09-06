import { ActionPanel, Action, List, Detail } from "@raycast/api";
import { useState, useEffect } from "react";

export interface MatchData {
  matchId: number;
  match: {
    scores: {
      red?: {
        totalPoints: number;
      };
      blue?: {
        totalPoints: number;
      };
    };
    teams: {
      alliance: "Red" | "Blue";
      teamNumber: number;
    }[];
    matchNum: number;
    series: number;
    tournamentLevel?: string;
  };
}

interface EventData {
  eventCode: string;
  name: string;
  start: string;
  end: string;
  season: number;
  event: {
    name: string;
    location: {
      city: string;
      state: string;
      country: string;
      venue: string;
    };
    teamMatches: MatchData[];
  };
  stats?: {
    wins?: number;
    losses?: number;
    ties?: number;
    rank?: number;
    opr?: {
      totalPointsNp?: number;
      dcPoints?: number;
      autoPoints?: number;
    };
    avg?: {
      totalPointsNp?: number;
    };
    rp?: number;
  };
}

export interface TeamData {
  name: string;
  number: number;
  location: {
    city: string;
    country: string;
    state: string;
  };
  quickStats: {
    auto: { rank: number; value: number };
    eg: { rank: number; value: number };
    tot: { rank: number; value: number };
    dc: { rank: number; value: number };
  };
  events?: EventData[];
  awards: {
    eventCode: string;
    type: string;
  }[];
}

export default function Command({
  arguments: { team },
}: {
  arguments: Arguments.FtcTeam;
}) {
  const [data, setData] = useState<TeamData | null>(null);
  const [teamExists, setTeamExists] = useState<boolean>(true);

  useEffect(() => {
    async function fetchTeam() {
      try {
        const query = `
query ExampleQuery($number: Int!, $season: Int!) {
  teamByNumber(number: $number) {
    name
    location {
      city
      state
      country
    }
    quickStats(season: $season) {
      auto {
        rank
        value
      }
      eg {
        rank
        value
      }
      tot {
        rank
        value
      }
      dc {
        rank
        value
      }
    }
    events(season: $season) {
      season
      eventCode
      event {
        location {
          city
          state
          country
          venue
        }
        teamMatches(teamNumber: $number) {
          match {
            scores {
              ... on MatchScores2024 {
                red {
                  totalPoints                 
                }
                blue {
                  totalPoints
                }
              }
            }
            teams {
              alliance
              teamNumber
            }
            matchNum
            series
            tournamentLevel
          }
          matchId
        }
        name
      }
      stats {
        ... on TeamEventStats2024 {
          wins
          losses
          ties
          rank
          opr {
            totalPointsNp
            dcPoints
            autoPoints
          }
          avg {
            totalPointsNp
          }
          rp
        }
      }
    }
    awards(season: $season) {
      eventCode
      type
    }
  }
}`;
        const variables = { number: parseInt(team), season: 2024 };

        const response = await fetch("https://api.ftcscout.org/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables }),
        });

        const json = (await response.json()) as {
          data?: { teamByNumber?: TeamData };
          errors?: unknown;
        };
        if (!json.data || !json.data.teamByNumber) {
          setTeamExists(false);
          console.log("GraphQL Response:", json);
        } else if (json.errors) {
          console.error("GraphQL Error:", json.errors);
          setTeamExists(false);
        } else {
          setData(json.data.teamByNumber);
        }
      } catch (error) {
        setTeamExists(false);
        console.error("Fetch Error:", error);
      }
    }

    fetchTeam();
  }, [team]);

  return (
    <>
      {teamExists ? (
        <List isShowingDetail={true} filtering={false}>
          {data ? (
            <>
              <List.Item
                title={`Team ${team}`}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      url={`https://ftcstats.org/team/${team}`}
                      title="View Team on FTC Stats"
                    />
                  </ActionPanel>
                }
                subtitle={`OPR: ${data.quickStats.tot.value.toFixed(2)}`}
                detail={
                  <List.Item.Detail
                    markdown={`
# Team ${team} - ${data.name}
From ${data.location.city}, ${data.location.state}, ${data.location.country}

## Quick Stats
|               | Total NP | Auto    | Teleop  | Endgame |
|---------------|----------|---------|---------|---------|
| **Best OPR**  | ${data.quickStats?.tot?.value !== undefined ? data.quickStats.tot.value.toFixed(2) : "-"} | ${data.quickStats?.auto?.value !== undefined ? data.quickStats.auto.value.toFixed(2) : "-"} | ${data.quickStats?.dc?.value !== undefined ? data.quickStats.dc.value.toFixed(2) : "-"} | ${data.quickStats?.eg?.value !== undefined ? data.quickStats.eg.value.toFixed(2) : "-"} |
| **Rank**      | ${data.quickStats?.tot?.rank ?? "-"}  | ${data.quickStats?.auto?.rank ?? "-"}  | ${data.quickStats?.dc?.rank ?? "-"}  | ${data.quickStats?.eg?.rank ?? "-"}  |`}
                  />
                }
              />

              <List.Section title="Events">
                {data.events?.map((event) => (
                  <List.Item
                    key={event.eventCode}
                    title={event.event.name}
                    subtitle={`${event.event.location.city}, ${event.event.location.state}`}
                    actions={
                      <ActionPanel>
                        <Action.OpenInBrowser
                          url={`https://ftcscout.org/events/2024/${event.eventCode}`}
                          title="View Event on FTC Stats"
                        />
                      </ActionPanel>
                    }
                    detail={
                      <List.Item.Detail
                        markdown={`
# ${event.event.name}

${event.event.location.venue === null ? "" : `${event.event.location.venue}, `}${event.event.location.city}, ${event.event.location.state}, ${event.event.location.country}

(${event.eventCode})

${
  event.stats
    ? `
Rank **${event.stats.rank}** (quals)

WLT: **${event.stats.wins}-${event.stats.losses}-${event.stats.ties}**

**${event.stats.rp?.toFixed(2)}** RP · **${event.stats.opr?.totalPointsNp?.toFixed(2)}** npOPR · **${event.stats.avg?.totalPointsNp?.toFixed(2)}** npAVG
`
    : ""
}

${getAwardsFTC(data.awards, event.eventCode)}

${getFTCMatchesTable(event.event.teamMatches, team, event.eventCode)}
        `}
                      />
                    }
                  />
                ))}
              </List.Section>
            </>
          ) : (
            <List.Item title={`Team ${team}`} subtitle="Loading..." />
          )}
        </List>
      ) : (
        <Detail markdown={`# Invalid Team Number\n    `} />
      )}
    </>
  );
}

function getFTCMatchesTable(
  matches: MatchData[],
  team?: string,
  eventCode?: string,
): string {
  if (!matches || matches.length === 0) return "No matches found.";
  const doubleElim = matches
    .filter((m) => m.match.tournamentLevel === "DoubleElim")
    .sort((a, b) => a.match.matchNum - b.match.matchNum);
  const qual = matches
    .filter((m) => m.match.tournamentLevel === "Quals")
    .sort((a, b) => a.match.matchNum - b.match.matchNum);
  const finals = matches
    .filter((m) => m.match.tournamentLevel === "Finals")
    .sort((a, b) => a.match.matchNum - b.match.matchNum);
  function tableSection(sectionMatches: MatchData[], sectionTitle: string) {
    if (sectionMatches.length === 0) return "";
    let md = `\n### ${sectionTitle}\n`;
    md += "|  Match Num  | Red Teams | Blue Teams | Red Score | Blue Score |\n";
    md += "|-------------|-----------|------------|-----------|------------|\n";
    md += sectionMatches
      .map((match) => {
        const redScore = match.match.scores?.red?.totalPoints;
        const blueScore = match.match.scores?.blue?.totalPoints;
        let redDisplay = redScore ?? "-";
        let blueDisplay = blueScore ?? "-";
        if (typeof redScore === "number" && typeof blueScore === "number") {
          if (redScore > blueScore) {
            redDisplay = `**${redScore}**`;
          } else if (blueScore > redScore) {
            blueDisplay = `**${blueScore}**`;
          }
        }
        const matchNumLabel =
          match.match.tournamentLevel == "DoubleElim"
            ? `Elims ${match.match.series}-${match.match.matchNum}`
            : `${match.match.tournamentLevel} ${match.match.matchNum}`;
        const matchLink = team
          ? `[${matchNumLabel}](https://ftcscout.org/teams/${team}?scores=${eventCode}-${match.match.matchNum}#${eventCode})`
          : `[${matchNumLabel}](https://ftcscout.org/matches/${eventCode}/scores=${eventCode}-${match.match.matchNum}#${eventCode})`;
        const redTeams = match.match.teams
          .filter((t) => t.alliance === "Red")
          .map((t) =>
            eventCode
              ? `[${t.teamNumber}](https://ftcscout.org/teams/${t.teamNumber}#${eventCode})`
              : `${t.teamNumber}`,
          )
          .join(", ");
        const blueTeams = match.match.teams
          .filter((t) => t.alliance === "Blue")
          .map((t) =>
            eventCode
              ? `[${t.teamNumber}](https://ftcscout.org/teams/${t.teamNumber}#${eventCode})`
              : `${t.teamNumber}`,
          )
          .join(", ");
        return `| ${matchLink} | ${redTeams} | ${blueTeams} | ${redDisplay} | ${blueDisplay} |`;
      })
      .join("\n");
    return md;
  }

  let result = "";
  if (qual.length > 0) result += tableSection(qual, "Qualifications");
  if (doubleElim.length > 0)
    result += tableSection(doubleElim, "Double Eliminations");
  if (finals.length > 0) result += tableSection(finals, "Finals");
  return result.trim() || "No matches found.";
}

export function getAwardsFTC(
  awards: { eventCode: string; type: string }[],
  event: string,
): string {
  if (!awards || awards.length === 0) return "";
  const types: string[] = [];
  for (const award of awards) {
    if (award.eventCode === event) {
      const regularCaseType = award.type
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
      const formattedType =
        regularCaseType.endsWith("Winner") ||
        regularCaseType.endsWith("Finalist")
          ? `**${regularCaseType}**`
          : `**${regularCaseType} Award** Winner`;
      types.push(formattedType);
    }
  }
  if (!types || types.length === 0) return "";
  return types.join(", ");
}
