import React from "react";
import { ActionPanel, Action, List, Icon, getPreferenceValues } from "@raycast/api";
import { getNHL } from "./utils/nhlData";
import { StandingsResponse, TeamStanding } from "./utils/types";
import { getLanguageKey, getCurrentDate, teamLogo } from "./utils/helpers";
import { gameTitles, divisionStrings, userInterface, gameActions } from "./utils/translations";

import Unresponsive from "./templates/unresponsive";
import TeamRoster from "./templates/teamRoster";
import TeamSchedule from "./templates/teamSchedule";

const lang = getLanguageKey();
const favoriteTeam = getPreferenceValues().team as string;
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
          title={standing.teamName[lang]}
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
            { text: "GD:" + standing.goalDifferential },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title={gameActions.viewRoster[lang]}
                icon={Icon.PersonLines}
                target={<TeamRoster team={standing.teamAbbrev.default} season={standing.seasonId} />}
              />
              <Action.Push
                title={gameActions.viewSchedule[lang]}
                icon={Icon.Calendar}
                target={<TeamSchedule team={standing.teamAbbrev.default} />}
              />
              <Action.OpenInBrowser url={`https://nhl.com/${standing.teamCommonName.default.toLowerCase()}`} />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
};

interface TeamStandingsData {
  conferencePlace: string;
  divisionPlace: string;
  points: string;
  teamName: string;
  gamesRemaining: number;
  seasonId: number;
  wildcardPlace?: string;
}

function getTeamStandings(data: StandingsResponse, teamAbbreviation: string): TeamStandingsData {
  const teamData = data.standings.find((team) => team.teamAbbrev.default === teamAbbreviation);

  if (!teamData) {
    return {
      conferencePlace: "Team not found",
      divisionPlace: "Team not found",
      points: "0 pts",
      teamName: "Team not found",
      gamesRemaining: 0,
      seasonId: 0,
    };
  }

  const totalConferenceTeams = data.standings.filter((team) => team.conferenceName === teamData.conferenceName).length;

  const totalDivisionTeams = data.standings.filter((team) => team.divisionName === teamData.divisionName).length;

  const wildcardPlace =
    data.wildCardIndicator && teamData.wildcardSequence ? `WC: ${teamData.wildcardSequence}` : undefined;

  return {
    conferencePlace: `${teamData.conferenceName}: ${teamData.conferenceSequence}/${totalConferenceTeams}`,
    divisionPlace: `${teamData.divisionName}: ${teamData.divisionSequence}/${totalDivisionTeams}`,
    points: `${teamData.points} pts`,
    teamName: teamData.teamName[lang],
    gamesRemaining: 82 - teamData.gamesPlayed,
    seasonId: teamData.seasonId,
    wildcardPlace,
  };
}

export default function Command() {
  const standingsToday = getNHL(`standings/${getCurrentDate()}`) as today;

  if (standingsToday.isLoading) return <List isLoading={true} />;
  if (!standingsToday?.data) return <Unresponsive />;

  const eastAtlanticDivision = organizeDivision(standingsToday.data, "Eastern", "Atlantic"),
    eastMetroDivision = organizeDivision(standingsToday.data, "Eastern", "Metropolitan"),
    westCentralDivision = organizeDivision(standingsToday.data, "Western", "Central"),
    westPacificDivision = organizeDivision(standingsToday.data, "Western", "Pacific");

  const teamStandings = getTeamStandings(standingsToday.data, favoriteTeam);

  return (
    <List>
      {favoriteTeam && favoriteTeam !== "default" && (
        <List.Section title={gameTitles.favorite[lang]}>
          <List.Item
            title={teamStandings.teamName}
            icon={teamLogo(favoriteTeam)}
            subtitle={`${teamStandings.gamesRemaining} ${userInterface.gamesRemaining[lang]}`}
            accessories={[
              { text: teamStandings.divisionPlace },
              { text: teamStandings.conferencePlace },
              { text: teamStandings.points },
              ...(teamStandings.wildcardPlace ? [{ text: teamStandings.wildcardPlace }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title={gameActions.viewRoster[lang]}
                  icon={Icon.PersonLines}
                  target={<TeamRoster team={favoriteTeam} season={teamStandings.seasonId} />}
                />
                <Action.Push
                  title={gameActions.viewSchedule[lang]}
                  icon={Icon.Calendar}
                  target={<TeamSchedule team={favoriteTeam} />}
                />
                <Action.OpenInBrowser url={`https://nhl.com/${favoriteTeam.toLowerCase()}`} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {renderDivision(eastAtlanticDivision, `${divisionStrings.eastern[lang]}: ${divisionStrings.atlantic[lang]}`)}
      {renderDivision(eastMetroDivision, `${divisionStrings.eastern[lang]}: ${divisionStrings.metropolitan[lang]}`)}
      {renderDivision(westCentralDivision, `${divisionStrings.western[lang]}: ${divisionStrings.central[lang]}`)}
      {renderDivision(westPacificDivision, `${divisionStrings.western[lang]}: ${divisionStrings.pacific[lang]}`)}
    </List>
  );
}
