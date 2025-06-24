import { NBATeam } from "../types/nba-scores";
import { List } from "@raycast/api";

type GameDetails = {
  homeTeam: NBATeam;
  awayTeam: NBATeam;
  lastPlay: string;
};

export default function ListDetail({ homeTeam, awayTeam, lastPlay }: GameDetails) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Last Play" text={`${lastPlay}`} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title={`${homeTeam.abbreviation} Leading Scorer`}
            text={`${homeTeam.leaders.points.shortName}: ${homeTeam.leaders.points.total}`}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title={`${awayTeam.abbreviation} Leading Scorer`}
            text={`${awayTeam.leaders.points.shortName}: ${awayTeam.leaders.points.total}`}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="FG%"
            text={`${homeTeam.abbreviation} ${homeTeam.stats.fieldGoalPct}%, ${awayTeam.abbreviation} ${awayTeam.stats.fieldGoalPct}%`}
          />
          <List.Item.Detail.Metadata.Label
            title="FT%"
            text={`${homeTeam.abbreviation} ${homeTeam.stats.freeThrowPct}%, ${awayTeam.abbreviation} ${awayTeam.stats.freeThrowPct}%`}
          />
          <List.Item.Detail.Metadata.Label
            title="3P%"
            text={`${homeTeam.abbreviation} ${homeTeam.stats.threePointPct}%, ${awayTeam.abbreviation} ${awayTeam.stats.threePointPct}%`}
          />
          <List.Item.Detail.Metadata.Label
            title="REB"
            text={`${homeTeam.abbreviation} ${homeTeam.stats.teamRebounds}, ${awayTeam.abbreviation} ${awayTeam.stats.teamRebounds}`}
          />
          <List.Item.Detail.Metadata.Label
            title="AST"
            text={`${homeTeam.abbreviation} ${homeTeam.stats.teamAssists}, ${awayTeam.abbreviation} ${awayTeam.stats.teamAssists}`}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
