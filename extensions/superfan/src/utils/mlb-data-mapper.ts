import { Root, Event, Competitor } from "../types/mlb-scores-raw";
import { Game, MLBTeam } from "../types/mlb-scores";

function mapCompetitorToMLBTeam(c: Competitor): MLBTeam {
  return {
    id: c.team.id,
    name: c.team.name,
    shortName: c.team.shortDisplayName,
    logo: c.team.logo,
    record: c.records?.[0]?.summary ?? "0-0",
    stats: {
      runs: c.score ?? "0",
      hits: c.hits ?? 0,
      errors: c.errors ?? 0,
    },
    winner: c.winner,
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

  const homeTeam = mapCompetitorToMLBTeam(homeCompetitor);
  const awayTeam = mapCompetitorToMLBTeam(awayCompetitor);
  const situation = competition.situation;

  return {
    id: competition.id,
    homeTeam,
    awayTeam,
    status: {
      state: competition.status.type.state,
      inning: competition.status.type.shortDetail,
    },
    situation: {
      balls: situation?.balls ?? 0,
      strikes: situation?.strikes ?? 0,
      outs: situation?.outs ?? 0,
      lastPlay: situation?.lastPlay?.text ?? "No last play available.",
      pitcher: {
        name: situation?.pitcher?.athlete.displayName ?? "N/A",
        shortName: situation?.pitcher?.athlete.shortName ?? "N/A",
        headshot: situation?.pitcher?.athlete.headshot ?? "",
      },
      batter: {
        name: situation?.batter?.athlete.displayName ?? "N/A",
        shortName: situation?.batter?.athlete.shortName ?? "N/A",
        headshot: situation?.batter?.athlete.headshot ?? "",
      },
      onFirst: situation?.onFirst ?? false,
      onSecond: situation?.onSecond ?? false,
      onThird: situation?.onThird ?? false,
    },
    link: event.links[0].href,
  };
}

export function cleanRawMlbScores(rawData: Root | undefined): Game[] {
  if (!rawData?.events) {
    return [];
  }

  return rawData.events.map(mapEventToGame).filter((game): game is Game => game !== null);
}
