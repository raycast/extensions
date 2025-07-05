import { Color, Icon, List } from "@raycast/api";
import { Event } from "./hooks/use-schedule";
import { getPreferenceValues } from "@raycast/api";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

interface Preferences {
  score: boolean;
  timezone: string;
}

const preferences = getPreferenceValues<Preferences>();

const getMatchStatePriority = (state: Event["state"]): number => {
  switch (state) {
    case "completed":
      return 2;
    case "unstarted":
      return 1;
    case "inProgress":
      return 0;
    default:
      return 99;
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
  return getZonedDate(b.startTime).getTime() - getZonedDate(a.startTime).getTime();
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

export const eventAccessories = (event: Event): List.Item.Accessory[] => {
  const [teamA, teamB] = event.match.teams;

  let strategy: List.Item.Accessory = {};
  switch (event.match.strategy.type) {
    case "bestOf":
      strategy = {
        tag: { value: `BO${event.match.strategy.count}`, color: Color.SecondaryText },
        tooltip: `Best of ${event.match.strategy.count}`,
      };

      break;
  }

  let matchScore: List.Item.Accessory = {};

  if (preferences.score && teamA.result?.outcome && teamB.result?.outcome) {
    matchScore = {
      tag: {
        value: `${teamA.result.gameWins} - ${teamB.result.gameWins}`,
        color: Color.Green,
      },
    };
  }
  return [matchScore, strategy];
};

interface EventDetail {
  title: string;
  subtitle: string;
  keywords: string[];
  icon: List.Item.Props["icon"];
  accessories: List.Item.Accessory[];
}

export const eventDetail = (event: Event, includeTime: boolean): EventDetail => {
  const [teamA, teamB] = event.match.teams;

  let subtitle = `${teamA.name} - ${teamB.name}`;

  if (preferences.score) {
    // Use preference here
    if (teamA.result?.outcome && teamB.result?.outcome) {
      subtitle = `${teamA.name}  -  ${teamB.name}`;
    }
  }

  const eventDate = new Date(event.startTime);

  const timezone = preferences.timezone || "";

  const title = includeTime
    ? formatInTimeZone(eventDate, timezone, "MMM d, HH:mm")
    : formatInTimeZone(eventDate, timezone, "HH:mm");

  const keywords = [...teamA.name.split(" "), ...teamB.name.split(" "), title];

  return {
    title: title,
    subtitle: subtitle,
    icon: eventIcon(event),
    accessories: eventAccessories(event),
    keywords: keywords,
  };
};

// Helper function to get the date in the target timezone
export const getZonedDate = (dateString: string | Date): Date => {
  const timezone = preferences.timezone || "";
  return fromZonedTime(new Date(dateString), timezone);
};
