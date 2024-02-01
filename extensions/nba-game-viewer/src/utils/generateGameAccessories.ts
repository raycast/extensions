import { log } from "console";
import type { Game } from "../types/schedule.types";
import { Icon, Color } from "@raycast/api";

const generateGameAccessories = (game: Game) => {
  if (game.status.period === 0) {
    return [{ text: game.time }, { icon: { source: Icon.Calendar }, tooltip: "Scheduled" }];
  }

  const [home, away] = game.competitors;
  const scoreDisplay = `${away?.abbreviation} ${away?.score} - ${home?.score} ${home?.abbreviation}`;

  if (game.status.period !== 0 && game.status.inProgress === false) {
    return [{ text: scoreDisplay }, { icon: { source: Icon.Checkmark, tintColor: Color.Green }, tooltip: "Completed" }];
  }

  return [
    { text: `${scoreDisplay} - Quarter #${game.status.period}` },
    { icon: { source: Icon.Video, tintColor: Color.Green }, tooltip: "In Progress" },
  ];
};

export default generateGameAccessories;
