import { Icon, List } from "@raycast/api";
import { Player } from "../types/player";
import { getSignedNumberNotationInString } from "./getSignedNumberNotation";
import { getRankingColor } from "./getRankingColor";

type CreateAccessoriesOpts = {
  player: Player;
  show: boolean;
  additionalAccessories?: List.Item.Accessory[] | null;
};

export const createAccessories = ({
  show,
  player,
  additionalAccessories,
}: CreateAccessoriesOpts): List.Item.Accessory[] | null => {
  if (!show) {
    return null;
  }
  return [
    ...(additionalAccessories ? additionalAccessories : []),
    ...(player.pointsChange
      ? [
          {
            tag: {
              value: getSignedNumberNotationInString(player.pointsChange),
              color: getRankingColor(player.pointsChange),
            },
          },
        ]
      : []),
    { icon: Icon.Leaderboard, text: `${player.points.toString()}` },
  ];
};
