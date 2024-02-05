import { Color, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { chain } from "lodash";
import { format as formatDate, isThisYear, isToday, isTomorrow, isYesterday } from "date-fns";
import { useSchedule } from "./lib/hooks/use-schedule";
import { LeagueDropdown } from "./lib/components/league-dropdown";

export default function ShowSchedule() {
  const [leagueId, setLeagueId] = useCachedState("leagueId", "98767991302996019");
  const { schedule, isLoading } = useSchedule(leagueId);

  const sections = chain(schedule?.events)
    .filter((event) => event.type === "match")
    .reverse()
    .groupBy((event) => formatDate(event.startTime, "yyyy-MM-dd"))
    .entries()
    .orderBy(([time]) => time, ["desc"])
    .value();

  return (
    <List
      isLoading={isLoading}
      // TODO: Uncomment when the scroll position can be controlled to center today.
      // selectedItemId={schedule?.events.toReversed().find((event) => isToday(event.startTime))?.match.id}
      searchBarPlaceholder="Search teams and days"
      searchBarAccessory={<LeagueDropdown value={leagueId} onChange={setLeagueId} />}
    >
      {sections.map(([time, events]) => {
        const date = new Date(time);
        let prefix = formatDate(date, "EEEE");
        if (isToday(date)) {
          prefix = "Today";
        } else if (isYesterday(date)) {
          prefix = "Yesterday";
        } else if (isTomorrow(date)) {
          prefix = "Tomorrow";
        }
        const title = `${prefix} - ${formatDate(date, "MMMM d")}${isThisYear(date) ? "" : formatDate(date, ", yyyy")}`;

        return (
          <List.Section key={time} title={title}>
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
              if (teamA.result?.outcome && teamsB.result?.outcome) {
                subtitle = `${teamA.name} ${teamA.result.gameWins} - ${teamsB.result.gameWins} ${teamsB.name}`;
              }

              return (
                <List.Item
                  key={event.match.id}
                  id={event.match.id}
                  icon={icon}
                  title={formatDate(event.startTime, "HH:mm")}
                  subtitle={subtitle}
                  accessories={[strategy]}
                  keywords={[...event.match.teams[0].name.split(" "), ...event.match.teams[1].name.split(" "), title]}
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
