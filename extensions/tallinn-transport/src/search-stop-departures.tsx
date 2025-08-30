import type { Stop } from "@/lib/stops";
import { getAllRoutesData } from "@/service/all-routes";
import { getDeparturesForStop } from "@/service/departures";
import { Action, ActionPanel, Color, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { format, formatDistanceToNow } from "date-fns";

const MAX_TAGS = 6;

function StopsList() {
  const { data, isLoading } = usePromise(() => getAllRoutesData(), [], {
    failureToastOptions: {
      title: "Error fetching stops",
    },
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search stop name...">
      {Array.from(data?.stops.values() || [])
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((stop) => {
          const routes = data?.routes.filter((route) => route.stopIds.includes(stop.id));

          const tags = routes?.slice(0, MAX_TAGS).map((route) => ({
            tag: {
              value: route.number,
              color: route.type === "bus" ? Color.Blue : Color.Red,
            },
          }));

          if (routes && routes.length > MAX_TAGS) {
            tags?.push({
              tag: {
                value: "...",
                color: Color.SecondaryText,
              },
            });
          }

          return (
            <List.Item
              key={stop.id}
              id={stop.id}
              title={stop.name}
              accessories={tags}
              actions={
                <ActionPanel>
                  <Action.Push title="Show Departures" target={<DeparturesList stop={stop} />} />
                  <Action.OpenInBrowser
                    title="Open in Google Maps"
                    url={`https://maps.google.com/?q=${stop.latitude},${stop.longitude}`}
                  />
                  <Action.OpenInBrowser
                    title="Open in Apple Maps"
                    url={`https://maps.apple.com/?q=${stop.latitude},${stop.longitude}`}
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}

function DeparturesList({ stop }: { stop: Stop }) {
  const { data, isLoading } = usePromise((siriId: string) => getDeparturesForStop(siriId), [stop.siriId], {
    failureToastOptions: {
      title: "Error fetching departures",
    },
  });

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Departures for ${stop.name}`}
      searchBarPlaceholder="Search departure..."
    >
      {data?.map((departure) => (
        <List.Item
          key={`${departure.routeNumber}-${departure.expectedIn.getTime()}`}
          title={`${departure.routeNumber}`}
          subtitle={`in ${formatDistanceToNow(departure.expectedIn)} at ${format(departure.expectedIn, "HH:mm")}`}
          accessories={[
            {
              tag: {
                value: departure.destination,
                color: Color.Green,
              },
            },
          ]}
        />
      ))}
    </List>
  );
}

export default function Command() {
  return <StopsList />;
}
