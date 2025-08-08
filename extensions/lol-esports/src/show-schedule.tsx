import { ActionPanel, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { chain } from "lodash";
import { addMinutes, differenceInMinutes, isThisYear, isToday, isPast, isFuture } from "date-fns";
import { useSchedule, Event } from "./lib/hooks/use-schedule";
import { LeagueDropdown } from "./lib/components/league-dropdown";
import { AddToCalendar } from "./lib/components/add-to-calendar";
import { eventDetail, getZonedDate, sortMatchDate, sortMatchPriority } from "./lib/utils";

export default function ShowSchedule() {
  const [leagueId, setLeagueId] = useCachedState("leagueId", "98767991302996019");
  const { schedule, isLoading } = useSchedule(leagueId);

  // Filter all relevant matches first (type 'match' and this year)
  const allMatchesThisYear = chain(schedule?.events)
    .filter((event: Event) => event.type === "match")
    .filter((event: Event) => isThisYear(getZonedDate(event.startTime)))
    .value();

  // Today matches
  const matchesToday = allMatchesThisYear
    .filter((event: Event) => isToday(getZonedDate(event.startTime)))
    .sort(sortMatchPriority);

  // Upcoming matches
  const upcomingMatches = allMatchesThisYear
    .filter((event: Event) => isFuture(getZonedDate(event.startTime)) && !isToday(getZonedDate(event.startTime)))
    .sort(sortMatchDate)
    .reverse();

  // Previous matches
  const previousMatches = allMatchesThisYear
    .filter((event: Event) => isPast(getZonedDate(event.startTime)) && !isToday(getZonedDate(event.startTime)))
    .sort(sortMatchDate);

  const commonEventDistance = chain(schedule?.events)
    .filter((event: Event) => event.type === "match")
    .takeRight(10)
    .map((event: Event, index, events) => {
      const nextEvent = events[index + 1];
      if (!nextEvent) {
        return 0;
      }
      const matches = event.match.strategy.count || 1;
      const minutes = differenceInMinutes(getZonedDate(nextEvent.startTime), getZonedDate(event.startTime));
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

  const renderSection = (title: string, events: Event[], includeTime: boolean = false) => {
    return (
      <List.Section key={title} title={title}>
        {events.map((event: Event) => {
          const [teamA, teamsB] = event.match.teams;
          const detail = eventDetail(event, includeTime);

          return (
            <List.Item
              key={event.match.id}
              id={event.match.id}
              icon={detail.icon}
              title={detail.title}
              subtitle={detail.subtitle}
              accessories={detail.accessories}
              keywords={detail.keywords}
              actions={
                <ActionPanel>
                  <AddToCalendar
                    event={{
                      title: `${teamA.name} vs ${teamsB.name}`,
                      startDate: event.startTime,
                      endDate: addMinutes(new Date(event.startTime), commonEventDistance as number),
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
      selectedItemId={schedule?.events.find((event: Event) => event.state !== "completed")?.match?.id}
      searchBarPlaceholder="Search teams and days"
      searchBarAccessory={<LeagueDropdown value={leagueId} onChange={setLeagueId} />}
    >
      {renderSection("Today's Matches", matchesToday)}
      {renderSection("Upcoming Matches", upcomingMatches, true)}
      {renderSection("Previous Matches", previousMatches, true)}
    </List>
  );
}
