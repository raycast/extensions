import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";

import type { Route } from "@/lib/routes";
import type { Stop } from "@/lib/stops";
import { getTimetables, getWorkdayType, type Timetable } from "@/lib/timetables";
import { getAllCachedRoutesData } from "@/service/all-routes";
import { formatDistanceToNow, isAfter } from "date-fns";

function RoutesList() {
  const { data, isLoading } = usePromise(() => getAllCachedRoutesData(), [], {
    failureToastOptions: {
      title: "Error fetching routes from Tallinn Transport",
    },
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search bus or tram line...">
      {data?.routes.map((route: Route) => (
        <List.Item
          key={route.id}
          icon={route.direction === "a-b" ? Icon.ArrowRight : Icon.ArrowLeft}
          title={route.number}
          subtitle={route.name}
          keywords={[route.number, route.name]}
          accessories={[
            {
              tag: {
                value: route.type.charAt(0).toUpperCase() + route.type.slice(1),
                color: route.type === "bus" ? Color.Blue : Color.Red,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Stops"
                icon={Icon.Train}
                target={<StopsList route={route} stops={data?.stops} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export function StopsList({ route, stops }: { route: Route; stops: Stop[] }) {
  const timetable = useMemo(() => getTimetables(route.times), [route.times]);

  return (
    <List navigationTitle={`Stops for route: ${route.number} - ${route.name}`} searchBarPlaceholder="Search stop name">
      {route.stopIds.map((stopId, index) => {
        const currentStopTimetable = timetable.filter((t) => t.stopIndex === index);
        const stopName = stops.find((stop) => stop.id === stopId)?.name || "Unknown stop";

        return (
          <List.Item
            key={stopId}
            id={stopId}
            title={stopName}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Times"
                  target={<StopTimesScreen stopName={stopName} times={currentStopTimetable} />}
                />
                <Action.OpenInBrowser
                  url={`https://transport.tallinn.ee/#${route.type}/${route.number}/${route.direction}/${stopId}`}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

const StopTimesScreen = ({ stopName, times }: { stopName: string; times: Timetable[] }) => {
  const now = new Date();
  const todayWorkday = getWorkdayType(now);
  const filteredTimes = times.filter((t) => t.workday === todayWorkday && t.time > now);

  return (
    <List navigationTitle={`Times for ${stopName} - ${todayWorkday}`} searchBarPlaceholder="Search time">
      {filteredTimes.length === 0 ? (
        <List.Item title="No upcoming times" />
      ) : (
        filteredTimes.map((time) => {
          const subtitle = isAfter(time.time, now) ? formatDistanceToNow(time.time, { addSuffix: true }) : undefined;
          return (
            <List.Item
              key={subtitle}
              title={time.time.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}
              subtitle={subtitle}
            />
          );
        })
      )}
    </List>
  );
};

export default function Command() {
  return <RoutesList />;
}
