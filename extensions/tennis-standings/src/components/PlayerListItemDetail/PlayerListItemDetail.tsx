import { Color, List } from "@raycast/api";
import { ListTag } from "../ListTag/ListTag";
import { getCountryInfo } from "../../utils/getCountryInfo";
import { getSignedNumberNotationInString } from "../../utils/getSignedNumberNotation";
import { Player } from "../../types/player";
import { FC } from "react";
import { getRankingColor } from "../../utils/getRankingColor";

type PlayerListItemDetailProps = {
  player: Player;
};

export const PlayerListItemDetail: FC<PlayerListItemDetailProps> = ({ player }) => {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title={player.name}
            text={`${getCountryInfo(player.country).name} ${getCountryInfo(player.country).emoji}`}
          />
          <List.Item.Detail.Metadata.Label title="Age" text={player.age.toString()} />
          <List.Item.Detail.Metadata.Label title="Points" text={player.points?.toString()} />
          <List.Item.Detail.Metadata.Separator />
          <ListTag title="Current ranking" text={player.ranking.toString()} color={Color.SecondaryText} />
          {player.careerHigh !== undefined && (
            <ListTag
              title="Career high"
              text={player.careerHigh.toString()}
              color={player.ranking === player.careerHigh ? Color.Yellow : Color.SecondaryText}
            />
          )}
          <ListTag
            title="Country rank"
            text={player.countryRank.toString()}
            color={player.countryRank === 1 ? Color.Yellow : Color.SecondaryText}
          />
          <List.Item.Detail.Metadata.Separator />
          <ListTag
            title="Ranking change from previous release"
            text={getSignedNumberNotationInString(player.rankingChange || 0)}
            color={getRankingColor(player.rankingChange || 0)}
          />
          <ListTag
            title="Points change from previous release"
            text={getSignedNumberNotationInString(player.pointsChange || 0)}
            color={getRankingColor(player.pointsChange || 0)}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Current tournament" text={player.currentTournament || "-"} />
          <List.Item.Detail.Metadata.Label
            title="Next points(if player wins next match)"
            text={player.next?.toString() || "-"}
          />
          <List.Item.Detail.Metadata.Label
            title="Max points(if player wins tournament)"
            text={player.max?.toString() || "-"}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
};
