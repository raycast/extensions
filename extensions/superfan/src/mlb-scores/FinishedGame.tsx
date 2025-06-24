import { Color, List } from "@raycast/api";
import { MLBTeam } from "../types/mlb-scores";
import { logoCache } from "../hooks/useMLBScores";

type GameDetails = {
  home: MLBTeam;
  away: MLBTeam;
  link: string;
};

export default function FinishedGame({ home, away, link }: GameDetails) {
  const homeRecord = `${home.name} (${home.record})`;
  const awayRecord = `${away.name} (${away.record})`;
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            icon={logoCache.get(home.id)}
            title="Home Team"
            text={{ value: homeRecord, color: home.winner ? Color.Green : Color.Red }}
          />
          <List.Item.Detail.Metadata.Label
            icon={logoCache.get(away.id)}
            title="Away Team"
            text={{ value: awayRecord, color: away.winner ? Color.Green : Color.Red }}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Final Score"
            text={`${home.shortName} ${home.stats.runs}, ${away.shortName} ${away.stats.runs}`}
          />
          <List.Item.Detail.Metadata.Label
            title="Hits"
            text={`${home.shortName}: ${home.stats.hits}  ${away.shortName}: ${away.stats.hits}`}
          />
          <List.Item.Detail.Metadata.Label
            title="Errors"
            text={`${home.shortName}: ${home.stats.errors} ${away.shortName}: ${away.stats.errors}`}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link title="View on ESPN" target={link} text="ESPN" />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
