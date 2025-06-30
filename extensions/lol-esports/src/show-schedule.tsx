import { ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api"; // Added getPreferenceValues
import { chain } from "lodash";
import {
  addMinutes,
  differenceInMinutes,
  format as formatDate,
  isThisYear,
  isToday,
  isTomorrow,
  isYesterday,
  isPast,
  isFuture,
} from "date-fns";
import { useSchedule } from "./lib/hooks/use-schedule";
import { LeagueDropdown } from "./lib/components/league-dropdown";
import { AddToCalendar } from "./lib/components/add-to-calendar";

interface Preferences {
  score: boolean;
}

const getMatchStatePriority = (state: string) => {
  switch (state) {
    case "unstarted":
      return 0; // Highest priority
    case "inProgress":
      return 1; // Medium priority
    case "completed":
      return 2; // Lowest priority
    default:
      return 99; // Fallback
  }
};

const sortMatchPriority = (a, b) => {
  const priorityA = getMatchStatePriority(a.state);
  const priorityB = getMatchStatePriority(b.state);

  if (priorityA === priorityB) {
    // If states are the same, sort by start time ascending
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  }
  return priorityA - priorityB; // Sort by state priority
};

const sortMatchDate = (a, b) => {
  return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
};

export default function ShowSchedule() {
  const preferences = getPreferenceValues<Preferences>();
  const [leagueId, setLeagueId] = useCachedState("leagueId", "98767991302996019");
  const { schedule, isLoading } = useSchedule(leagueId);

  // Filter all relevant matches first (type 'match' and this year)
  const allMatchesThisYear = chain(schedule?.events)
    .filter((event) => event.type === "match")
    .filter((event) => isThisYear(new Date(event.startTime)))
    .value();

  // Categorize events using filter
  const matchesToday = allMatchesThisYear.filter((event) => isToday(new Date(event.startTime)));
  const matchesTomorrow = allMatchesThisYear.filter((event) => isTomorrow(new Date(event.startTime)));
  const upcomingMatches = allMatchesThisYear.filter(
    (event) => isFuture(new Date(event.startTime)) && !isTomorrow(new Date(event.startTime)),
  ); // Exclude tomorrow as it has its own category
  const previousMatches = allMatchesThisYear.filter(
    (event) =>
      isPast(new Date(event.startTime)) &&
      !isToday(new Date(event.startTime)) &&
      !isTomorrow(new Date(event.startTime)),
  ); // Exclude today/tomorrow as they have their own categories

  // Sort today's matches: by state priority (unstarted first), then by time ascending (coming match first)
  matchesToday.sort(sortMatchPriority);

  // Sort tomorrow's matches by time ascending (chronological)
  matchesTomorrow.sort(sortMatchDate);

  // Sort upcoming matches (beyond tomorrow) by date descending (latest time first)
  upcomingMatches.sort(sortMatchDate);

  // Sort previous matches by date descending (most recent past first / latest time first)
  previousMatches.sort(sortMatchDate);

  const commonEventDistance = chain(schedule?.events)
    .filter((event) => event.type === "match")
    .takeRight(10)
    .map((event, index, events) => {
      const nextEvent = events[index + 1];
      if (!nextEvent) {
        return 0;
      }
      const matches = event.match.strategy.count || 1;
      const minutes = differenceInMinutes(nextEvent.startTime, event.startTime);
      return minutes / matches;
    })
    .filter((distance) => distance > 0 && distance <= 300)
    .groupBy()
    .entries()
    .orderBy(([, values]) => values.length, "desc")
    .map(([distance]) => distance)
    .first()
    .defaultTo(60)
    .value();

  // renderSection now takes an optional boolean to format time with or without date
  const renderSection = (title: string, events: any[], includeDateInTimeFormat: boolean = false) => {
      return (
      <List.Section key={title} title={title}>
        {events.map((event) => {
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

          let strategy: List.Item.Accessory = {};
          switch (event.match.strategy.type) {
            case "bestOf":
              strategy = {
                text: `BO${event.match.strategy.count}`,
                tooltip: `Best of ${event.match.strategy.count}`,
              };
              break;
          }

          const teamA = event.match.teams[0];
          const teamsB = event.match.teams[1];
          let subtitle = `${teamA.name} - ${teamsB.name}`;

          if (preferences.score) {
            if (teamA.result?.outcome && teamsB.result?.outcome) {
              subtitle = `${teamA.name} ${teamA.result.gameWins} - ${teamsB.result.gameWins} ${teamsB.name}`;
            }
          }

          const date = new Date(event.startTime);
          const itemTitle = includeDateInTimeFormat ? formatDate(date, "MMM d, HH:mm") : formatDate(date, "HH:mm");

          return (
            <List.Item
              key={event.match.id}
              id={event.match.id}
              icon={icon}
              title={itemTitle}
              subtitle={subtitle}
              accessories={[strategy]}
              keywords={[...teamA.name.split(" "), ...teamsB.name.split(" "), title]}
              actions={
                <ActionPanel>
                  <AddToCalendar
                    event={{
                      title: `${teamA.name} vs ${teamsB.name}`,
                      startDate: event.startTime,
                      endDate: addMinutes(event.startTime, commonEventDistance as number),
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    );
  };

  return (
    <List
      isLoading={isLoading}
      selectedItemId={schedule?.events.find((event) => event.state !== "completed")?.match?.id}
      searchBarPlaceholder="Search teams and days"
      searchBarAccessory={<LeagueDropdown value={leagueId} onChange={setLeagueId} />}
    >
      {renderSection("Today's Matches", matchesToday)}
      {renderSection("Tomorrow's Matches", matchesTomorrow)}
      {renderSection("Upcoming Matches", upcomingMatches, true)}
      {renderSection("Previous Matches", previousMatches, true)}
    </List>
  );
}
