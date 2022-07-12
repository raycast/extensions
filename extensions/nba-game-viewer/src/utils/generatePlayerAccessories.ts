import type { Player, Injury } from "../types/roster.types";
import { Color } from "@raycast/api";

const generatePlayerAccessories = (player: Player) => {
  if (player.injuries.length > 0) {
    let foundInjury: any = [];

    player.injuries.map((injury: Injury) => {
      if (injury.status === "Out") {
        foundInjury = [{ text: `Out — ${injury.details}` }, { icon: { source: "heart.png", tintColor: Color.Red } }];
      }
    });

    if (foundInjury.length > 0) {
      return foundInjury;
    }

    return [{ text: "Day to Day" }, { icon: { source: "heart.png", tintColor: Color.Orange } }];
  }

  return [{ text: "Healthy" }, { icon: { source: "heart.png", tintColor: Color.Green } }];
};

export default generatePlayerAccessories;
