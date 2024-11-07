import React from "react";
import { ActionPanel, Action, List } from "@raycast/api";
import { getNHL } from "./utils/nhlData";
import { StandingsResponse, TeamStanding } from "./utils/types";
import { getLanguageKey, getCurrentDate, teamLogo } from "./utils/helpers";

import Unresponsive from "./templates/unresponsive";

const languageKey = getLanguageKey();

interface today {
  data: StandingsResponse;
  isLoading: boolean;
}

type Conference = "Eastern" | "Western";
type EasternDivision = "Atlantic" | "Metropolitan";
type WesternDivision = "Central" | "Pacific";
type Division = EasternDivision | WesternDivision;

const DIVISION_MAP: Record<Conference, Division[]> = {
  Eastern: ["Atlantic", "Metropolitan"],
  Western: ["Central", "Pacific"],
} as const;

function organizeDivision(
  standings: StandingsResponse,
  conference: Conference,
  division: Division,
): StandingsResponse["standings"] {
  // Validate that the division belongs to the conference
  if (!DIVISION_MAP[conference].includes(division)) {
    throw new Error(`${division} division is not in the ${conference} conference`);
  }

  const teams = standings.standings
    .filter((team) => team.conferenceName === conference && team.divisionName === division)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (a.gamesPlayed !== b.gamesPlayed) return a.gamesPlayed - b.gamesPlayed;
      if (b.regulationWins !== a.regulationWins) return b.regulationWins - a.regulationWins;
      return b.regulationPlusOtWins - a.regulationPlusOtWins;
    });

  return teams;
}

const renderDivision = (team: TeamStanding[], division: string) => {
  return (
    <List.Section title={division}>
      {team.map((standing) => (
        <List.Item
          key={standing.teamAbbrev.default}
          title={standing.teamName[languageKey]}
					icon={teamLogo(standing.teamAbbrev.default)}
          accessories={[
            { text: "GP:" + standing.gamesPlayed },
            { text: "W:" + standing.wins },
            { text: "L:" + standing.losses },
            { text: "P:" + standing.points },
            { text: "P%:" + standing.pointPctg.toFixed(3) },
            { text: "RW:" + standing.regulationWins },
            { text: "ROW:" + standing.regulationPlusOtWins },
            { text: "GF:" + standing.goalFor },
            { text: "GA:" + standing.goalAgainst },
            { text: "GD:" + standing.goalDifferential }
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://nhl.com/${standing.teamCommonName.default.toLowerCase()}`} />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
};

export default function Command() {
  const standingsToday = getNHL(`standings/${getCurrentDate()}`) as today;

  if (standingsToday.isLoading) return <List isLoading={true} />;

  if (!standingsToday?.data) return <Unresponsive />;

  const eastAtlanticDivision = organizeDivision(standingsToday.data, "Eastern", "Atlantic"),
    eastMetroDivision = organizeDivision(standingsToday.data, "Eastern", "Metropolitan"),
    westCentralDivision = organizeDivision(standingsToday.data, "Western", "Central"),
    westPacificDivision = organizeDivision(standingsToday.data, "Western", "Pacific");

  return (
    <List>
      {renderDivision(eastAtlanticDivision, "Eastern: Atlantic")}
      {renderDivision(eastMetroDivision, "Eastern: Metropolitan")}
      {renderDivision(westCentralDivision, "Western: Central")}
      {renderDivision(westPacificDivision, "Eastern: Pacific")}
    </List>
  );
}
