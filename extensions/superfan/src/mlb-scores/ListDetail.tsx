import { List } from "@raycast/api";
import { MLBTeam, Situation } from "../types/mlb-scores";

type GameDetails = {
  home: MLBTeam;
  away: MLBTeam;
  liveAtBat: Situation | undefined;
};

export default function MLBScoresDetail({ home, away, liveAtBat }: GameDetails) {
  const filled = "●";
  const empty = "○";
  const outs = liveAtBat?.outs ?? 0;
  const gameFinished = liveAtBat === undefined;
  const onFirst = liveAtBat?.onFirst ?? false;
  const onSecond = liveAtBat?.onSecond ?? false;
  const onThird = liveAtBat?.onThird ?? false;
  const noBases = !(onFirst || onSecond || onThird);

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Pitcher"
            icon={liveAtBat?.pitcher?.headshot}
            text={liveAtBat?.pitcher?.shortName}
          />
          <List.Item.Detail.Metadata.Label
            title="Batter"
            icon={liveAtBat?.batter?.headshot}
            text={liveAtBat?.batter?.shortName}
          />
          <List.Item.Detail.Metadata.Label title="Last Play" text={liveAtBat?.lastPlay} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Bases">
            {noBases && <List.Item.Detail.Metadata.TagList.Item text="None" color={"#d2d1d0"} />}
            {onFirst && <List.Item.Detail.Metadata.TagList.Item text="1st" color={"#d2d1d0"} />}
            {onSecond && <List.Item.Detail.Metadata.TagList.Item text="2nd" color={"#d2d1d0"} />}
            {onThird && <List.Item.Detail.Metadata.TagList.Item text="3rd" color={"#d2d1d0"} />}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.TagList title="Count">
            {!gameFinished && (
              <List.Item.Detail.Metadata.TagList.Item
                text={`${liveAtBat?.balls} - ${liveAtBat?.strikes}`}
                color={"#d2d1d0"}
              />
            )}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label title="Outs" text={filled.repeat(outs) + empty.repeat(3 - outs)} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label icon={home.logo} title="Home Team" text={`${home.name} (${home.record})`} />
          <List.Item.Detail.Metadata.Label icon={away.logo} title="Away Team" text={`${away.name} (${away.record})`} />
          <List.Item.Detail.Metadata.Label
            title="Hits"
            text={`${home.shortName}: ${home.stats.hits}  ${away.shortName}: ${away.stats.hits}`}
          />
          <List.Item.Detail.Metadata.Label
            title="Errors"
            text={`${home.shortName}: ${home.stats.errors} ${away.shortName}: ${away.stats.errors}`}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
