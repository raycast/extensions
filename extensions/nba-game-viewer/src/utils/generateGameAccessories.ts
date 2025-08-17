import { Icon, Color, List } from "@raycast/api";
import { useShowDetails } from "../contexts/showDetailsContext";
import type { Game } from "../types/schedule.types";
import Accessory = List.Item.Accessory;

const generateGameAccessories = (game: Game): Accessory[] => {
  const { value: showDetails } = useShowDetails();

  const [home, away] = game.competitors;
  const scoreDisplay = showDetails
    ? `${away.score} - ${home.score}`
    : `${away.abbreviation} ${away.score} - ${home.score} ${home.abbreviation}`;
  const scoreTooltip = showDetails ? `${away.shortName} - ${home.shortName}` : undefined;

  if (game.status.period === 0 && !game.status.inProgress) {
    return [{ text: game.date }, { icon: { source: Icon.Calendar }, tooltip: "Scheduled" }];
  }

  if (game.status.inProgress) {
    return [
      { text: `Q${game.status.period}: ${scoreDisplay}`, tooltip: scoreTooltip },
      { icon: { source: Icon.Video, tintColor: Color.Green }, tooltip: "In Progress" },
    ];
  }

  if (game.status.completed) {
    const completedIcon = { source: Icon.CheckCircle, tintColor: Color.Green };

    return [
      ...(showDetails
        ? [{ text: scoreDisplay, tooltip: scoreTooltip }]
        : [
            {
              tag: { value: away.score.toString(), color: away.score > home.score ? Color.Green : Color.SecondaryText },
              icon: away.logo,
              tooltip: away.shortName,
            },
            { text: "@" },
            {
              tag: { value: home.score.toString(), color: home.score > away.score ? Color.Green : Color.SecondaryText },
              icon: home.logo,
              tooltip: home.shortName,
            },
          ]),
      { icon: completedIcon, tooltip: "Completed" },
    ];
  }

  return [{ text: "Unknown Game State" }];
};

export default generateGameAccessories;
