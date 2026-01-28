import { Action, ActionPanel, List } from "@raycast/api";
import { FC } from "react";
import { Player } from "../../types/player";
import { createAccessories } from "../../utils/createAccessories";
import { getCountryInfo } from "../../utils/getCountryInfo";
import { getSignedNumberNotationInString } from "../../utils/getSignedNumberNotation";
import { PlayerListItemDetail } from "../PlayerListItemDetail/PlayerListItemDetail";

type PlayerListItemProps = {
  player: Player;
  additionalAccessories?: List.Item.Accessory[] | null;
  onShowPlayerInRanking: (playerId: string) => void;
  isShowingDetails: boolean;
  onShowDetails: () => void;
  isSearching: boolean;
};

export const PlayerListItem: FC<PlayerListItemProps> = ({
  player,
  additionalAccessories,
  onShowPlayerInRanking,
  onShowDetails,
  isShowingDetails,
  isSearching,
}) => {
  const playerId = player.ranking + player.name;

  return (
    <List.Item
      id={playerId}
      actions={
        <ActionPanel>
          <Action title={isShowingDetails ? "Hide Details" : "Show Details"} onAction={onShowDetails} />
          {isSearching && (
            <Action
              title="Show Player in Ranking"
              onAction={() => {
                onShowPlayerInRanking(playerId);
              }}
            />
          )}
        </ActionPanel>
      }
      title={`${player.ranking}. ${getCountryInfo(player.country).emoji} ${player.name}`}
      subtitle={player.rankingChange ? getSignedNumberNotationInString(player.rankingChange || 0) : undefined}
      accessories={createAccessories({ player, show: !isShowingDetails, additionalAccessories })}
      detail={<PlayerListItemDetail player={player} />}
    />
  );
};
