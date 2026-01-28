import type { Player } from "../types/player.types";
import { Color, Icon, List } from "@raycast/api";

const generatePlayerAccessories = (player: Player): List.Item.Accessory[] => {
  const playerRank = player?.ranking?.rank;
  const playerSkill = player?.ranking?.skill;
  const progress = ((playerSkill - playerRank.minSkill) / (playerRank.maxSkill - playerRank.minSkill)) * 100;

  return [
    {
      icon: { source: Icon.CircleProgress, tintColor: Color.Magenta },
      tooltip: "Progress to next rank:" + progress.toFixed() + "%",
    },
    { tag: { value: playerSkill.toString(), color: Color.Magenta }, tooltip: "Skill" },
  ];
};

export default generatePlayerAccessories;
