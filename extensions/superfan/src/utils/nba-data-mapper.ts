import { Root, Event, Competitor } from "../types/nba-scores-raw";
import { Game, NBATeam } from "../types/nba-scores";

function mapCompetitorToNBATeam(c: Competitor): NBATeam {
  return {
    id: c.team.id,
    name: c.team.name,
    shortName: c.team.shortDisplayName,
    abbreviation: c.team.abbreviation,
    logo: c.team.logo,
    record: c.records?.[0]?.summary ?? "0-0",
    stats: {
      score: c.score ?? "0",
      fieldGoalPct: c.statistics[5].displayValue ?? "0",
      threePointPct: c.statistics[10].displayValue ?? "0",
      freeThrowPct: c.statistics[6].displayValue ?? "0",
      teamRebounds: c.statistics[0].displayValue ?? "0",
      teamAssists: c.statistics[2].displayValue ?? "0",
    },
    leaders: {
      points: {
        shortName: c.leaders[0].leaders[0].athlete.shortName ?? "N/A",
        total: c.leaders[0].leaders[0].displayValue ?? "0",
      },
      rebounds: {
        shortName: c.leaders[1].leaders[0].athlete.shortName ?? "N/A",
        total: c.leaders[1].leaders[0].displayValue ?? "0",
      },
    },
  };
}

function mapEventToGame(event: Event): Game | null {
  const competition = event.competitions?.[0];
  if (!competition) {
    return null;
  }

  const homeCompetitor = competition.competitors.find((c) => c.homeAway === "home");
  const awayCompetitor = competition.competitors.find((c) => c.homeAway === "away");

  if (!homeCompetitor || !awayCompetitor) {
    return null;
  }

  const homeTeam = mapCompetitorToNBATeam(homeCompetitor);
  const awayTeam = mapCompetitorToNBATeam(awayCompetitor);

  return {
    id: competition.id,
    homeTeam,
    awayTeam,
    status: {
      state: competition.status.type.state,
      description: competition.status.type.shortDetail,
      quarter: competition.status.period,
    },
    lastPlay: competition?.situation?.lastPlay?.text ?? "N/A",
  };
}

export function cleanRawNBAScores(rawData: Root | undefined): Game[] {
  if (!rawData?.events) {
    return [];
  }

  return rawData.events.map(mapEventToGame).filter((game): game is Game => game !== null);
}
