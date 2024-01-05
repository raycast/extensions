import { ActionPanel, Detail, List, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";




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
    
    const { isLoading, data } = useFetch("https://api-web.nhle.com/v1/standings/now") as { isLoading: boolean; data: any;};
    console.log(data);
    const standingsData = data as StandingsResponse;
    // We need to sort the standings by conference, division and points

    // Iterate over the list and create a dictionary that has the conference and division as the key, then the StandingsEntry as the value
    // Then iterate over the dictionary and sort the teams by points
    var standings: any = {};
    console.log("Standings Data", standingsData);
    (standingsData.standings || []).forEach((entry: any) => {
        const key = `${entry.conferenceName}}`;
        if (!standings[key]) {
            standings[key] = {};
        }
        const divisionKey = `${entry.divisionName}`;
        if (!standings[key][divisionKey]) {
            standings[key][divisionKey] = [];
        }
        standings[key][divisionKey].push(entry);

    });
    const timeOptions: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit'
    };
    return (
        <List isLoading={isLoading} isShowingDetail>
            {(Object.keys(standings) || []).map((conference: any) => {
                return (
                    <List.Section title={conference}>
                        {(Object.keys(standings[conference]) || []).map((division: any) => {
                            return (
                                <List.Section title={division}>
                                    {(standings[conference][division] || []).sort((a: any, b: any) => {
                                        return b.points - a.points;
                                    }).map((team: any) => (
                                        <List.Item key={team.teamAbbrev.default} title={team.teamName.default} subtitle={`${team.wins} - ${team.losses} - ${team.otLosses}`} detail={
                                            <List.Item.Detail markdown={`**${team.points}** points`} />
                                        } actions={
                                            <ActionPanel>
                                                <Action.OpenInBrowser title={`Open Team Site`} url={`https://www.nhl.com${team.teamAbbrev.default}`} />
                                                <Action.OpenInBrowser title={`Buy Tickets`} url={team.teamAbbrev.default.ticketsLink} />
                                            </ActionPanel>
                                        } />
                                    ))}
                                </List.Section>
                            );
                        })}
                    </List.Section>
                );
            })}
        </List>
    );
}
