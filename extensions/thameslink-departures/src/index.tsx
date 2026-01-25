import {
  List,
  Icon,
  Color,
  ActionPanel,
  Action,
  getPreferenceValues,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface Preferences {
  appId: string;
  appKey: string;
}

interface TrainDeparture {
  train_uid: string;
  platform: string;
  operator: string;
  aimed_departure_time: string;
  expected_departure_time: string | null;
  status: string;
  destination_name: string;
  origin_name: string;
}

interface DeparturesResponse {
  request_time: string;
  departures: {
    all: TrainDeparture[];
  };
}

const FARRINGDON_CRS = "ZFD";
const JOURNEY_TIME_TO_HARPENDEN = 35; // minutes

function getMinutesUntil(timeStr: string): number {
  const now = new Date();
  const [hours, minutes] = timeStr.split(":").map(Number);
  const departure = new Date();
  departure.setHours(hours, minutes, 0, 0);
  return Math.round((departure.getTime() - now.getTime()) / 60000);
}

function addMinutesToTime(timeStr: string, minsToAdd: number): string {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes + minsToAdd, 0, 0);
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isThameslink(departure: TrainDeparture): boolean {
  return departure.operator === "TL";
}

function isBedfordOrLuton(departure: TrainDeparture): boolean {
  const dest = departure.destination_name.toLowerCase();
  return dest.includes("bedford") || dest.includes("luton");
}

function getDepartureTime(departure: TrainDeparture): string {
  if (departure.status.toLowerCase() === "cancelled")
    return departure.aimed_departure_time;
  return departure.expected_departure_time || departure.aimed_departure_time;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const apiUrl = `https://transportapi.com/v3/uk/train/station/${FARRINGDON_CRS}/live.json?app_id=${preferences.appId}&app_key=${preferences.appKey}&train_status=passenger`;

  const { isLoading, data, revalidate, error } = useFetch<DeparturesResponse>(
    apiUrl,
    {
      keepPreviousData: true,
    },
  );

  const departures =
    data?.departures?.all?.filter((d) => {
      if (!isThameslink(d) || !isBedfordOrLuton(d)) return false;
      const depTime = getDepartureTime(d);
      const minsUntil = getMinutesUntil(depTime);
      return minsUntil >= -1; // Include trains leaving now (within 1 min grace)
    }) ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter trains...">
      {error && (
        <List.EmptyView
          icon={{ source: Icon.Train, tintColor: Color.Red }}
          title="Failed to load"
          description={
            error.message.includes("401")
              ? "Check API credentials"
              : error.message
          }
        />
      )}
      {!isLoading && departures.length === 0 && !error && (
        <List.EmptyView
          icon={{ source: Icon.Train, tintColor: Color.SecondaryText }}
          title="No trains"
          description="No Bedford or Luton trains found"
        />
      )}
      {departures.map((departure, index) => {
        const isCancelled = departure.status.toLowerCase() === "cancelled";
        const isOnTime = departure.status.toLowerCase() === "on time";
        const departureTime = getDepartureTime(departure);
        const minsUntil = getMinutesUntil(departureTime);
        const harpendenArrival = addMinutesToTime(
          departureTime,
          JOURNEY_TIME_TO_HARPENDEN,
        );

        // Format the "leaving in" text
        let leavingIn: string;
        if (isCancelled) {
          leavingIn = "Cancelled";
        } else if (minsUntil <= 0) {
          leavingIn = "Now";
        } else if (minsUntil === 1) {
          leavingIn = "1 min";
        } else {
          leavingIn = `${minsUntil} mins`;
        }

        // Determine icon and color based on status
        let icon: { source: Icon; tintColor: Color };
        let tagColor: Color;

        if (isCancelled) {
          icon = { source: Icon.XMarkCircle, tintColor: Color.Red };
          tagColor = Color.Red;
        } else if (!isOnTime) {
          icon = { source: Icon.Clock, tintColor: Color.Orange };
          tagColor = Color.Orange;
        } else {
          icon = { source: Icon.CheckCircle, tintColor: Color.Green };
          tagColor = Color.Green;
        }

        return (
          <List.Item
            key={`${departure.train_uid}-${index}`}
            icon={icon}
            title={leavingIn}
            subtitle={
              isCancelled
                ? `${departure.aimed_departure_time} to ${departure.destination_name}`
                : `${departureTime} → Harpenden ${harpendenArrival}`
            }
            accessories={[
              ...(departure.platform
                ? [
                    {
                      tag: {
                        value: `P${departure.platform}`,
                        color: Color.SecondaryText,
                      },
                    },
                  ]
                : []),
              ...(!isOnTime && !isCancelled
                ? [{ tag: { value: departure.status, color: tagColor } }]
                : []),
              {
                tag: {
                  value: departure.destination_name.replace(" (Midland)", ""),
                  color: Color.PrimaryText,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
                <Action.CopyToClipboard
                  title="Copy Info"
                  content={`${departureTime} to ${departure.destination_name} - Harpenden arrival ~${harpendenArrival} (${departure.status})`}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
