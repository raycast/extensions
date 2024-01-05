import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

interface TeamName {
  default: string;
  fr?: string;
}

interface StandingsEntry {
  conferenceAbbrev: string;
  conferenceHomeSequence: number;
  conferenceL10Sequence: number;
  conferenceName: string;
  conferenceRoadSequence: number;
  conferenceSequence: number;
  date: string;
  divisionAbbrev: string;
  divisionHomeSequence: number;
  divisionL10Sequence: number;
  divisionName: string;
  divisionRoadSequence: number;
  divisionSequence: number;
  gameTypeId: number;
  gamesPlayed: number;
  goalDifferential: number;
  goalDifferentialPctg: number;
  goalAgainst: number;
  goalFor: number;
  goalsForPctg: number;
  homeGamesPlayed: number;
  homeGoalDifferential: number;
  homeGoalsAgainst: number;
  homeGoalsFor: number;
  homeLosses: number;
  homeOtLosses: number;
  homePoints: number;
  homeRegulationPlusOtWins: number;
  homeRegulationWins: number;
  homeTies: number;
  homeWins: number;
  l10GamesPlayed: number;
  l10GoalDifferential: number;
  l10GoalsAgainst: number;
  l10GoalsFor: number;
  l10Losses: number;
  l10OtLosses: number;
  l10Points: number;
  l10RegulationPlusOtWins: number;
  l10RegulationWins: number;
  l10Ties: number;
  l10Wins: number;
  leagueHomeSequence: number;
  leagueL10Sequence: number;
  leagueRoadSequence: number;
  leagueSequence: number;
  losses: number;
  otLosses: number;
  placeName: TeamName;
  pointPctg: number;
  points: number;
  regulationPlusOtWinPctg: number;
  regulationPlusOtWins: number;
  regulationWinPctg: number;
  regulationWins: number;
  roadGamesPlayed: number;
  roadGoalDifferential: number;
  roadGoalsAgainst: number;
  roadGoalsFor: number;
  roadLosses: number;
  roadOtLosses: number;
  roadPoints: number;
  roadRegulationPlusOtWins: number;
  roadRegulationWins: number;
  roadTies: number;
  roadWins: number;
  seasonId: number;
  shootoutLosses: number;
  shootoutWins: number;
  streakCode: string;
  streakCount: number;
  teamName: TeamName;
  teamCommonName: TeamName;
  teamAbbrev: TeamName;
  teamLogo: string;
  ties: number;
  waiversSequence: number;
  wildcardSequence: number;
  winPctg: number;
  wins: number;
}

interface StandingsResponse {
  wildCardIndicator: boolean;
  standings: StandingsEntry[];
}

export default function Command() {
  const [metropolitanStandings, setMetropolitanStandings] = useState<StandingsEntry[]>([]);
  const [atlanticStandings, setAtlanticStandings] = useState<StandingsEntry[]>([]);
  const [centralStandings, setCentralStandings] = useState<StandingsEntry[]>([]);
  const [pacificStandings, setPacificStandings] = useState<StandingsEntry[]>([]);

  const { isLoading, data } = useFetch("https://api-web.nhle.com/v1/standings/now") as {
    isLoading: boolean;
    data: StandingsResponse;
  };

  const standings: Record<string, StandingsEntry[]> = {};
  ((data && data.standings) || []).forEach((entry: StandingsEntry) => {
    if (!standings[entry.divisionName]) {
      standings[entry.divisionName] = [];
    }
    standings[entry.divisionName].push(entry);
    standings[entry.divisionName].sort((a: StandingsEntry, b: StandingsEntry) => {
      return b.points - a.points;
    });
  });

  if (metropolitanStandings.length === 0 && standings["Metropolitan"]) {
    setMetropolitanStandings(standings["Metropolitan"]);
  }
  if (atlanticStandings.length === 0 && standings["Atlantic"]) {
    setAtlanticStandings(standings["Atlantic"]);
  }
  if (centralStandings.length === 0 && standings["Central"]) {
    setCentralStandings(standings["Central"]);
  }
  if (pacificStandings.length === 0 && standings["Pacific"]) {
    setPacificStandings(standings["Pacific"]);
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title="Metropolitan">
        {(metropolitanStandings || []).map((team: StandingsEntry) => (
          <List.Item
            key={team.teamAbbrev.default}
            title={`${team.teamName.default} (${team.points})`}
            subtitle={`${team.wins} - ${team.losses} - ${team.otLosses}`}
          />
        ))}
      </List.Section>
      <List.Section title="Atlantic">
        {(atlanticStandings || []).map((team: StandingsEntry) => (
          <List.Item
            key={team.teamAbbrev.default}
            title={team.teamName.default}
            subtitle={`${team.wins} - ${team.losses} - ${team.otLosses}`}
          />
        ))}
      </List.Section>
      <List.Section title="Central">
        {(centralStandings || []).map((team: StandingsEntry) => (
          <List.Item
            key={team.teamAbbrev.default}
            title={team.teamName.default}
            subtitle={`${team.wins} - ${team.losses} - ${team.otLosses}`}
          />
        ))}
      </List.Section>
      <List.Section title="Pacific">
        {(pacificStandings || []).map((team: StandingsEntry) => (
          <List.Item
            key={team.teamAbbrev.default}
            title={team.teamName.default}
            subtitle={`${team.wins} - ${team.losses} - ${team.otLosses}`}
          />
        ))}
      </List.Section>

      <List.EmptyView icon={{ source: "sad-puck.png" }} title="Something went wrong" />
    </List>
  );
}
