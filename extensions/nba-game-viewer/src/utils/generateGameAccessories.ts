import { Icon, Color } from "@raycast/api";
import type { Game } from "../types/schedule.types";

const generateGameAccessories = (game: Game) => {
  const [home, away] = game.competitors;
  const scoreDisplay = `${away.abbreviation} ${away.score} - ${home.score} ${home.abbreviation}`;

  if (game.status.period === 0 && !game.status.inProgress) {
    return [{ text: game.date }, { icon: { source: Icon.Calendar }, tooltip: "Scheduled" }];
  }

  if (game.status.inProgress) {
    return [
      { text: `${scoreDisplay} - Q${game.status.period}` },
      { icon: { source: Icon.Video, tintColor: Color.Green }, tooltip: "In Progress" },
    ];
  }

  if (game.status.completed) {
    const completedIcon = { source: Icon.CheckCircle, tintColor: Color.Green };

    return [{ text: scoreDisplay }, { icon: completedIcon, tooltip: "Completed" }];
  }

  return [{ text: "Unknown Game State" }];
};

export default generateGameAccessories;
