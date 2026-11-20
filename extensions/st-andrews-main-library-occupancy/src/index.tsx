import { Action, ActionPanel, Detail, environment, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { dashboardGraphic, type Metric } from "./dashboard-view";
import {
  congestionHue,
  endpoints,
  mergeComputers,
  mergeOccupancy,
  parseAverageVisit,
  parseBusiestHour,
  parseComputers,
  parseOccupancy,
  sortByAvailability,
} from "./data";
import { refreshFeeds } from "./feed-requests";
import { useFeed } from "./use-feed";

const liveInterval = 30_000;
const summaryInterval = 300_000;
const magenta = 323;
const purple = 265;
const blue = 208;
const number = new Intl.NumberFormat();
const percent = new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 1 });

const readOccupancy = async (response: Response) => parseOccupancy(await response.json());
const readAverageVisit = async (response: Response) => parseAverageVisit(await response.json());
const readBusiestHour = async (response: Response) => parseBusiestHour(await response.text());
const readComputers = async (response: Response) => parseComputers(await response.json());

function display(value?: number) {
  return value === undefined ? "—" : number.format(value);
}

export default function Command() {
  const occupancy = useFeed(endpoints.occupancy, liveInterval, readOccupancy, mergeOccupancy);
  const average = useFeed(endpoints.averageVisit, summaryInterval, readAverageVisit);
  const busiest = useFeed(endpoints.busiestHour, summaryInterval, readBusiestHour);
  const computers = useFeed(endpoints.computers, liveInterval, readComputers, mergeComputers);
  const [sorted, setSorted] = useState(false);
  const rooms = sorted && computers.data ? sortByAvailability(computers.data) : computers.data;

  const { rate, total, capacity } = occupancy.data ?? {};
  const loading = [occupancy, average, busiest, computers].some((feed) => feed.loading);
  const percentage = rate === undefined ? "—" : percent.format(rate);
  const people = `👥 ${display(total)} / ${display(capacity)} people`;

  const dark = environment.theme === "dark";
  const statistics: Metric[] = [
    {
      label: "🧑🏻‍🎓 Students",
      value: display(occupancy.data?.students),
      hue: magenta,
      loading: occupancy.data?.students === undefined,
    },
    {
      label: "🧑🏻‍💻 Staff",
      value: display(occupancy.data?.staff),
      hue: magenta,
      loading: occupancy.data?.staff === undefined,
    },
    {
      label: "🚶🏻 Visitors",
      value: display(occupancy.data?.visitors),
      hue: magenta,
      loading: occupancy.data?.visitors === undefined,
    },
    { label: "🕒 Average Visit", value: average.data ?? "—", hue: purple, loading: average.loading },
    { label: "⏰ Busiest Hour", value: busiest.data ?? "—", hue: blue, loading: busiest.loading },
  ];

  const roomRows: Metric[] | undefined = rooms?.length
    ? rooms.map((room) => ({
        label: `🖥️ ${room.name.replace(/\s+/g, " ")}`,
        value: `${display(room.available)} free / ${display(room.total)}`,
        loading: room.available === undefined || room.total === undefined,
        hue: room.rate === undefined ? undefined : congestionHue(1 - room.rate),
      }))
    : rooms && [{ label: "No rooms reported" }];

  const markdown = dashboardGraphic(percentage, people, rate, statistics, roomRows, sorted, dark);

  async function refreshData() {
    const failures = await refreshFeeds([
      { label: "Occupancy", refresh: occupancy.refresh },
      { label: "Average Visit", refresh: average.refresh },
      { label: "Busiest Hour", refresh: busiest.refresh },
      { label: "Available Computers", refresh: computers.refresh },
    ]);
    if (failures.length) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Refresh All Data",
        message: failures.join("; "),
      });
    }
  }

  return (
    <Detail
      markdown={markdown}
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action title="Refresh Data" icon="🔄" shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={refreshData} />
          <Action
            title={sorted ? "Restore Original Order" : "Sort by Availability"}
            icon="🖥️"
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            onAction={() => setSorted((previous) => !previous)}
          />
        </ActionPanel>
      }
    />
  );
}
