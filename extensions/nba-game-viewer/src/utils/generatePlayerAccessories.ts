import type { Player, Injury } from "../types/roster.types";
import { Color, List } from "@raycast/api";

const generatePlayerAccessories = (player: Player): List.Item.Accessory[] => {
  if (player.injuries.length > 0) {
    let foundInjury: List.Item.Accessory[] = [];

    player.injuries.map((injury: Injury) => {
      if (injury.status === "Out") {
        foundInjury = [
          { icon: { source: "heart.png", tintColor: Color.Red }, tooltip: `Status: Out — ${injury.details}` },
        ];
      }
    });

    if (foundInjury.length > 0) {
      return foundInjury;
    }

    return [{ icon: { source: "heart.png", tintColor: Color.Orange }, tooltip: "Status: Day to Day" }];
  }

  return [{ icon: { source: "heart.png", tintColor: Color.Green }, tooltip: "Status: Healthy" }];
};

export default generatePlayerAccessories;
