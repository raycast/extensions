import {
  MenuBarExtra,
  Icon,
  getPreferenceValues,
  LocalStorage,
  launchCommand,
  LaunchType,
  openExtensionPreferences,
} from "@raycast/api";
import { useFetch, useCachedPromise } from "@raycast/utils";
import { PRIMDeparturesResponse, Preferences, ParsedDeparture, StopConfig, MenuBarDisplayMode } from "./api/types";
import { parseDepartures, getLineColor } from "./api/prim";
import { formatMinutesUntil, formatTime } from "./utils/time";
import { STOP_CONFIG_KEY } from "./onboarding";

const BASE_URL = "https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia";

function getMenuBarTitle(
  departure: ParsedDeparture | undefined,
  displayMode: MenuBarDisplayMode,
  walkingTimeMinutes: number | undefined,
): string {
  if (!departure) {
    return "No metro";
  }

  const hasWalkingTime = walkingTimeMinutes !== undefined && walkingTimeMinutes > 0;
  const minutesUntilMetro = departure.minutesUntil;
  const minutesUntilLeave = hasWalkingTime ? minutesUntilMetro - walkingTimeMinutes : minutesUntilMetro;

  switch (displayMode) {
    case "leave":
      if (hasWalkingTime) {
        if (minutesUntilLeave <= 0) {
          return "Leave now!";
        }
        return `Leave in ${minutesUntilLeave} min`;
      }
      // Fallback to metro time if no walking time configured
      return `Metro in ${minutesUntilMetro} min`;

    case "metro":
      return `Metro in ${minutesUntilMetro} min`;

    case "countdown":
      if (hasWalkingTime) {
        if (minutesUntilLeave <= 0) {
          return "Now!";
        }
        return `${minutesUntilLeave} min`;
      }
      return `${minutesUntilMetro} min`;

    default:
      return `Metro in ${minutesUntilMetro} min`;
  }
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { apiKey, menuBarDisplayMode = "leave" } = preferences;

  const { data: stopConfig, isLoading: isLoadingConfig } = useCachedPromise(async () => {
    const stored = await LocalStorage.getItem<string>(STOP_CONFIG_KEY);
    if (stored) {
      return JSON.parse(stored) as StopConfig;
    }
    return null;
  });

  if (!apiKey || apiKey.trim() === "") {
    return (
      <MenuBarExtra icon={Icon.Train} title="⚠️">
        <MenuBarExtra.Item title="API Key Required" icon={Icon.Key} onAction={openExtensionPreferences} />
        <MenuBarExtra.Item title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra>
    );
  }

  if (isLoadingConfig) {
    return <MenuBarExtra icon={Icon.Train} isLoading={true} />;
  }

  if (!stopConfig) {
    return (
      <MenuBarExtra icon={Icon.Train} title="⚙️">
        <MenuBarExtra.Item
          title="Configure Your Stop"
          icon={Icon.Pin}
          onAction={() => launchCommand({ name: "onboarding", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra>
    );
  }

  return <DeparturesMenuBar apiKey={apiKey} stopConfig={stopConfig} displayMode={menuBarDisplayMode} />;
}

function DeparturesMenuBar({
  apiKey,
  stopConfig,
  displayMode,
}: {
  apiKey: string;
  stopConfig: StopConfig;
  displayMode: MenuBarDisplayMode;
}) {
  const url = `${BASE_URL}/stop_areas/${encodeURIComponent(stopConfig.stopId)}/departures?count=20`;

  const { isLoading, data, revalidate } = useFetch<PRIMDeparturesResponse>(url, {
    headers: {
      Accept: "application/json",
      apikey: apiKey,
    },
  });

  const departures: ParsedDeparture[] = data?.departures ? parseDepartures(data.departures, stopConfig.lineCode) : [];

  const filteredDepartures = stopConfig.favoriteDirections?.length
    ? departures.filter((d) => stopConfig.favoriteDirections!.includes(d.direction))
    : departures;

  const nextDeparture = filteredDepartures[0];

  const menuTitle = getMenuBarTitle(nextDeparture, displayMode, stopConfig.walkingTimeMinutes);

  const lineColor = stopConfig.lineColor ? getLineColor(stopConfig.lineColor) : undefined;

  const groupedByDirection = new Map<string, ParsedDeparture[]>();
  for (const departure of filteredDepartures) {
    const key = departure.direction;
    const existing = groupedByDirection.get(key) || [];
    existing.push(departure);
    groupedByDirection.set(key, existing);
  }

  const sortedSections = Array.from(groupedByDirection.entries()).sort(([dirA], [dirB]) => {
    if (stopConfig.favoriteDirections?.length) {
      const aIsFav = stopConfig.favoriteDirections.includes(dirA);
      const bIsFav = stopConfig.favoriteDirections.includes(dirB);
      if (aIsFav && !bIsFav) return -1;
      if (!aIsFav && bIsFav) return 1;
    }
    return dirA.localeCompare(dirB, "fr");
  });

  return (
    <MenuBarExtra
      icon={{ source: Icon.Train, tintColor: lineColor }}
      title={menuTitle}
      isLoading={isLoading}
      tooltip={`Line ${stopConfig.lineCode} · ${stopConfig.stopName}`}
    >
      <MenuBarExtra.Section title={`Line ${stopConfig.lineCode} · ${stopConfig.stopName}`}>
        {stopConfig.walkingTimeMinutes && stopConfig.walkingTimeMinutes > 0 && (
          <MenuBarExtra.Item title={`🚶 Walking time: ${stopConfig.walkingTimeMinutes} min`} icon={Icon.Footprints} />
        )}
      </MenuBarExtra.Section>

      {sortedSections.length === 0 && !isLoading ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="No upcoming departures" icon={Icon.Clock} />
        </MenuBarExtra.Section>
      ) : (
        sortedSections.map(([direction, directionDepartures]) => {
          const isFavorite = stopConfig.favoriteDirections?.includes(direction);
          const sectionTitle = isFavorite ? `★ → ${direction}` : `→ ${direction}`;
          return (
            <MenuBarExtra.Section key={direction} title={sectionTitle}>
              {directionDepartures.slice(0, 3).map((departure) => {
                const timeUntil = formatMinutesUntil(departure.minutesUntil);
                const absoluteTime = formatTime(departure.departureTime);
                const realTimeIndicator = departure.isRealTime ? "⚡" : "📅";
                return (
                  <MenuBarExtra.Item
                    key={departure.id}
                    title={`${realTimeIndicator} ${timeUntil}`}
                    subtitle={`at ${absoluteTime}`}
                    icon={Icon.Clock}
                  />
                );
              })}
            </MenuBarExtra.Section>
          );
        })
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={revalidate}
        />
        <MenuBarExtra.Item
          title="Open Next Metro"
          icon={Icon.Window}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => launchCommand({ name: "check-next-metro", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Configure Stop"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={() => launchCommand({ name: "onboarding", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
