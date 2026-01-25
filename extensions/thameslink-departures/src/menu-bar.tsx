import {
  MenuBarExtra,
  Icon,
  Color,
  getPreferenceValues,
  LaunchType,
  launchCommand,
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
}

interface DeparturesResponse {
  departures: {
    all: TrainDeparture[];
  };
}

const FARRINGDON_CRS = "ZFD";
const JOURNEY_TIME_TO_HARPENDEN = 35;

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

  const { isLoading, data, revalidate } = useFetch<DeparturesResponse>(apiUrl, {
    keepPreviousData: true,
  });

  const departures =
    data?.departures?.all?.filter((d) => {
      if (!isThameslink(d) || !isBedfordOrLuton(d)) return false;
      const depTime = getDepartureTime(d);
      const minsUntil = getMinutesUntil(depTime);
      return minsUntil >= -1;
    }) ?? [];
  const nextTrain = departures[0];

  // Determine menu bar title
  let menuTitle = "🚂 --";
  const menuIcon: Icon | undefined = undefined;

  if (isLoading && !data) {
    menuTitle = "🚂 ...";
  } else if (nextTrain) {
    const isCancelled = nextTrain.status.toLowerCase() === "cancelled";
    const isOnTime = nextTrain.status.toLowerCase() === "on time";
    const departureTime = getDepartureTime(nextTrain);
    const minsUntil = getMinutesUntil(departureTime);

    if (isCancelled) {
      menuTitle = "❌ Cancelled";
    } else if (!isOnTime) {
      menuTitle = `⚠️ ${minsUntil}m`;
    } else if (minsUntil <= 0) {
      menuTitle = "✅ Now";
    } else {
      menuTitle = `✅ ${minsUntil}m`;
    }
  }

  return (
    <MenuBarExtra icon={menuIcon} title={menuTitle} isLoading={isLoading}>
      {nextTrain && (
        <>
          <MenuBarExtra.Section title="Next Train">
            {(() => {
              const isCancelled =
                nextTrain.status.toLowerCase() === "cancelled";
              const departureTime = getDepartureTime(nextTrain);
              const minsUntil = getMinutesUntil(departureTime);
              const harpendenArrival = addMinutesToTime(
                departureTime,
                JOURNEY_TIME_TO_HARPENDEN,
              );

              return (
                <>
                  <MenuBarExtra.Item
                    icon={
                      isCancelled
                        ? { source: Icon.XMarkCircle, tintColor: Color.Red }
                        : { source: Icon.Train, tintColor: Color.Blue }
                    }
                    title={
                      isCancelled
                        ? "Cancelled"
                        : `Leaves in ${minsUntil} min${minsUntil !== 1 ? "s" : ""}`
                    }
                    subtitle={nextTrain.status}
                  />
                  <MenuBarExtra.Item
                    icon={{
                      source: Icon.Clock,
                      tintColor: Color.SecondaryText,
                    }}
                    title={`${departureTime} → Harpenden ${harpendenArrival}`}
                  />
                  <MenuBarExtra.Item
                    icon={{ source: Icon.Pin, tintColor: Color.SecondaryText }}
                    title={
                      nextTrain.platform
                        ? `Platform ${nextTrain.platform}`
                        : "Platform TBA"
                    }
                  />
                  <MenuBarExtra.Item
                    icon={{
                      source: Icon.ArrowRight,
                      tintColor: Color.SecondaryText,
                    }}
                    title={nextTrain.destination_name}
                  />
                </>
              );
            })()}
          </MenuBarExtra.Section>
        </>
      )}

      {departures.length > 1 && (
        <MenuBarExtra.Section title="Following Trains">
          {departures.slice(1, 4).map((departure, index) => {
            const isCancelled = departure.status.toLowerCase() === "cancelled";
            const isOnTime = departure.status.toLowerCase() === "on time";
            const departureTime = getDepartureTime(departure);
            const minsUntil = getMinutesUntil(departureTime);

            let title = `${departureTime} to ${departure.destination_name.replace(" (Midland)", "")}`;
            if (isCancelled) {
              title += " ✗";
            } else if (!isOnTime) {
              title += ` (${departure.status})`;
            }

            return (
              <MenuBarExtra.Item
                key={`${departure.train_uid}-${index}`}
                icon={
                  isCancelled
                    ? { source: Icon.XMarkCircle, tintColor: Color.Red }
                    : { source: Icon.Clock, tintColor: Color.SecondaryText }
                }
                title={title}
                subtitle={isCancelled ? "" : `${minsUntil}m`}
              />
            );
          })}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.ArrowClockwise}
          title="Refresh"
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={revalidate}
        />
        <MenuBarExtra.Item
          icon={Icon.List}
          title="View All Departures"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() =>
            launchCommand({ name: "index", type: LaunchType.UserInitiated })
          }
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
