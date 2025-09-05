import { Action, ActionPanel, List } from "@raycast/api";
import { useState } from "react";
import { TeamData } from "./ftc-team";

interface EventData {
  name: string;
  start: string;
  end: string;
  code: string;
  location: {
    city: string;
    state: string;
    country: string;
    venue: string;
  };
  matches: {
    matchNum: number;
    series: number;
    tournamentLevel: string;
    teams: {
      alliance: "Red" | "Blue";
      teamNumber: number;
    }[];
    scores: {
      red?: {
        totalPointsNp: number;
      };
      blue?: {
        totalPointsNp: number;
      };
    };
  }[];
}

export default function Command() {
  const [data, setData] = useState<TeamData[] | EventData[] | null>(null);
  const [searchText, setSearchText] = useState<string>("");
  async function fetchData(currentSearch: string) {
    if (currentSearch.length < 3) {
      return;
    }
    try {
      const query = `
query ExampleQuery($searchText: String, $limit: Int, $season: Int!) {
  teamsSearch(searchText: $searchText, limit: $limit) {
    name
    number
    location {
      city
      state
      country
    }
    quickStats(season: $season) {
      auto { rank value }
      eg { rank value }
      tot { rank value }
      dc { rank value }
    }
    awards(season: $season) {
      eventCode
      type
    }
  }
  eventsSearch(searchText: $searchText, season: $season, limit: $limit) {
    matches {
      scores {
        ... on MatchScores2024 {
          blue {
            totalPointsNp
          }
          red {
            totalPointsNp
          }
        }
      }
      
      teams {
        alliance
        teamNumber
      }
      id
      matchNum
      tournamentLevel
      series
    }
    name
    start
    end
    code
    location {
      city
      country
      state
      venue
    }
  }
}`;

      const variables = { searchText: currentSearch, limit: 10, season: 2024 };
      const response = await fetch("https://api.ftcscout.j5155.page/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
      });
      const json = await response.json();
      console.log("GraphQL Response:", json.data.eventsSearch);
      if (json.errors) {
        console.error("GraphQL Error:", json.errors);
        setData([]);
      } else if (!json.data || (!json.data.teamsSearch && !json.data.eventsSearch)) {
        setData([]);
      } else {
        let teams = Array.isArray(json.data.teamsSearch) ? json.data.teamsSearch : [];
        let events = Array.isArray(json.data.eventsSearch) ? json.data.eventsSearch : [];
        teams = teams.slice(0, 10);
        events = events.slice(0, 10);
        setData([...teams, ...events].filter(Boolean));
        console.log("Combined Data:", [...teams, ...events]);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      setData([]);
    }
  }

  return (
    <List
      isShowingDetail={true}
      filtering={false}
      onSearchTextChange={(value) => {
        setSearchText(value.toString());
        fetchData(value.toString());
      }}
      searchText={searchText}
      isLoading={searchText.length > 0 && data === null}
      throttle={true}
    >
      {data && data.length > 0 ? (
        data.map((item) => {
          if (isTeamData(item)) {
            return (
              <List.Item
                key={"team-" + item.number}
                title={`${item.number} - ${item.name}`}
                subtitle={
                  item.location ? `${item.location.city}, ${item.location.state}, ${item.location.country}` : undefined
                }
                detail={
                  <List.Item.Detail
                    markdown={`# Team ${item.number} - ${item.name}
  From ${item.location.city}, ${item.location.state}, ${item.location.country}

  ## Quick Stats
  |               | Total NP | Auto    | Teleop  | Endgame |
  |---------------|----------|---------|---------|---------|
  | **Best OPR**  | ${item.quickStats?.tot?.value !== undefined ? item.quickStats.tot.value.toFixed(2) : "-"} | ${item.quickStats?.auto?.value !== undefined ? item.quickStats.auto.value.toFixed(2) : "-"} | ${item.quickStats?.dc?.value !== undefined ? item.quickStats.dc.value.toFixed(2) : "-"} | ${item.quickStats?.eg?.value !== undefined ? item.quickStats.eg.value.toFixed(2) : "-"} |
  | **Rank**      | ${item.quickStats?.tot?.rank ?? "-"}  | ${item.quickStats?.auto?.rank ?? "-"}  | ${item.quickStats?.dc?.rank ?? "-"}  | ${item.quickStats?.eg?.rank ?? "-"}  |`}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      url={`https://ftcstats.org/team/${item.number}`}
                      title="View Team on FTC Stats"
                    />
                  </ActionPanel>
                }
              />
            );
          } else if (isEventData(item)) {
            return (
              <List.Item
                key={"event-" + item.code}
                title={item.name}
                detail={
                  <List.Item.Detail
                    markdown={`
# ${item.name}

${item.location.venue === null ? "" : `${item.location.venue}, `}${item.location.city}, ${item.location.state}, ${item.location.country}

(${item.code})

${getFTCMatchesTable(item.matches, item.code)}
`}
                  />
                }
              />
            );
          } else {
            return null;
          }
        })
      ) : searchText.length > 0 && data && data.length === 0 ? (
        <List.EmptyView title="No teams found" />
      ) : (
        <List.EmptyView title="Type to search for FTC teams" />
      )}
    </List>
  );
}

function getFTCMatchesTable(matches: EventData["matches"], eventCode?: string): string {
  if (!matches || matches.length === 0) return "No matches found.";

  const doubleElim = matches.filter((m) => m.tournamentLevel === "DoubleElim").sort((a, b) => a.matchNum - b.matchNum);
  const qual = matches.filter((m) => m.tournamentLevel === "Quals").sort((a, b) => a.matchNum - b.matchNum);
  const finals = matches.filter((m) => m.tournamentLevel === "Finals").sort((a, b) => a.matchNum - b.matchNum);

  function tableSection(sectionMatches: EventData["matches"], sectionTitle: string) {
    if (sectionMatches.length === 0) return "";
    let md = `\n### ${sectionTitle}\n`;
    md += "|  Match Num  | Red Teams | Blue Teams | Red Score | Blue Score |\n";
    md += "|-------------|-----------|------------|-----------|------------|\n";
    md += sectionMatches
      .map((match) => {
        const redScore = match.scores?.red?.totalPointsNp;
        const blueScore = match.scores?.blue?.totalPointsNp;
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
          match.tournamentLevel === "DoubleElim"
            ? `Elims ${match.matchNum}`
            : `${match.tournamentLevel} ${match.matchNum}`;

        const matchLink = eventCode
          ? `[${matchNumLabel}](https://ftcscout.org/matches/${eventCode}/scores=${eventCode}-${match.matchNum}#${eventCode})`
          : matchNumLabel;

        const redTeams = match.teams
          .filter((t) => t.alliance === "Red")
          .map((t) =>
            eventCode
              ? `[${t.teamNumber}](https://ftcscout.org/teams/${t.teamNumber}#${eventCode})`
              : `${t.teamNumber}`,
          )
          .join(", ");

        const blueTeams = match.teams
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
  if (doubleElim.length > 0) result += tableSection(doubleElim, "Double Eliminations");
  if (finals.length > 0) result += tableSection(finals, "Finals");
  return result.trim() || "No matches found.";
}

function isTeamData(obj: unknown): obj is TeamData {
  return (
    obj !== null &&
    typeof obj === "object" &&
    "number" in obj &&
    typeof (obj as Record<string, unknown>).number === "number" &&
    "name" in obj &&
    typeof (obj as Record<string, unknown>).name === "string" &&
    "quickStats" in obj
  );
}

function isEventData(obj: unknown): obj is EventData {
  return (
    obj !== null &&
    typeof obj === "object" &&
    "name" in obj &&
    typeof (obj as Record<string, unknown>).name === "string" &&
    "code" in obj
  );
}
