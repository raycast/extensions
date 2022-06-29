import type { Game } from "../types/schedule.types";
import { Icon, Color } from "@raycast/api";

const generateGameAccessories = (game: Game) => {
  if (game.status.period === 0) {
    return [{ text: game.time }, { icon: { source: Icon.Calendar }, tooltip: "Scheduled" }];
  }

  if (game.status.period !== 0 && game.status.inProgress === false) {
    return [{ text: "Completed" }, { icon: { source: Icon.Checkmark, tintColor: Color.Green } }];
  }

  return [
    { text: `Quarter #${game.status.period}` },
    { icon: { source: Icon.Video, tintColor: Color.Green }, tooltip: "In Progress" },
  ];
};

export default generateGameAccessories;
