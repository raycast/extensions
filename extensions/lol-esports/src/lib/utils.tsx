import { Color, Icon, List } from "@raycast/api";
import { Event } from "./hooks/use-schedule";
import { getPreferenceValues } from "@raycast/api";
import { format as formatDate } from "date-fns";

interface Preferences {
  score: boolean;
}

const getMatchStatePriority = (state: Event["state"]): number => {
  switch (state) {
    case "completed":
      return 0; // Lowest priority
    case "unstarted":
      return 1; // Highest priority
    case "inProgress":
      return 2; // Medium priority
    default:
      return 99; // Fallback
  }
};

export const sortMatchPriority = (a: Event, b: Event) => {
  const priorityA = getMatchStatePriority(a.state);
  const priorityB = getMatchStatePriority(b.state);

  if (priorityA === priorityB) {
    // If states are the same, sort by start time ascending
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  }
  return priorityA - priorityB; // Sort by state priority
};

export const sortMatchDate = (a: Event, b: Event) => {
  return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
};

export const eventIcon = (event: Event): List.Item.Props["icon"] => {
  let icon: List.Item.Props["icon"];
  switch (event.state) {
    case "completed":
      icon = {
        source: Icon.CheckCircle,
        tintColor: Color.Green,
        tooltip: "Finished",
      };
      break;
    case "inProgress":
      icon = {
        source: Icon.Livestream,
        tintColor: Color.Red,
        tooltip: "Live",
      };
      break;
    case "unstarted":
    default:
      icon = {
        source: Icon.Calendar,
        tintColor: Color.SecondaryText,
        tooltip: "Scheduled",
      };
      break;
  }

  return icon;
};

const preferences = getPreferenceValues<Preferences>();

export const eventStrategy = (event: Event): List.Item.Accessory => {
  let strategy: List.Item.Accessory = {};
  switch (event.match.strategy.type) {
    case "bestOf":
      strategy = {
        text: `BO${event.match.strategy.count}`,
        tooltip: `Best of ${event.match.strategy.count}`,
      };
      break;
  }

  return strategy;
};

interface EventDetail {
  title: string;
  subtitle: string;
  keywords: string[];
  icon: List.Item.Props["icon"];
  strategy: List.Item.Accessory;
}

export const eventDetail = (event: Event, includeTime: boolean): EventDetail => {
  const [teamA, teamsB] = event.match.teams;

  let subtitle = `${teamA.name} - ${teamsB.name}`;

  if (preferences.score) {
    // Use preference here
    if (teamA.result?.outcome && teamsB.result?.outcome) {
      subtitle = `${teamA.name} ${teamA.result.gameWins} - ${teamsB.result.gameWins} ${teamsB.name}`;
    }
  }

  const eventDate = new Date(event.startTime);

  const title = includeTime ? formatDate(eventDate, "MMM d, HH:mm") : formatDate(eventDate, "HH:mm");

  const keywords = [...teamA.name.split(" "), ...teamsB.name.split(" "), title];

  return {
    title: title,
    subtitle: subtitle,
    icon: eventIcon(event),
    strategy: eventStrategy(event),
    keywords: keywords,
  };
};
