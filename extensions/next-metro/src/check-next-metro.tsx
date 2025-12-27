import {
  List,
  Icon,
  Color,
  getPreferenceValues,
  ActionPanel,
  Action,
  openExtensionPreferences,
  LocalStorage,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useFetch, useCachedPromise } from "@raycast/utils";
import { PRIMDeparturesResponse, Preferences, ParsedDeparture, StopConfig } from "./api/types";
import { parseDepartures, getLineColor } from "./api/prim";
import { formatMinutesUntil, formatTime } from "./utils/time";
import { STOP_CONFIG_KEY } from "./onboarding";

const BASE_URL = "https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia";
const PRIM_SIGNUP_URL = "https://prim.iledefrance-mobilites.fr/";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { apiKey } = preferences;

  const {
    data: stopConfig,
    isLoading: isLoadingConfig,
    revalidate: revalidateConfig,
  } = useCachedPromise(async () => {
    const stored = await LocalStorage.getItem<string>(STOP_CONFIG_KEY);
    if (stored) {
      return JSON.parse(stored) as StopConfig;
    }
    return null;
  });

  if (!apiKey || apiKey.trim() === "") {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Key}
          title="API Key Required"
          description="Please configure your PRIM API key to get started."
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action.OpenInBrowser title="Get API Key from PRIM" url={PRIM_SIGNUP_URL} icon={Icon.Globe} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (isLoadingConfig) {
    return <List isLoading={true} />;
  }

  if (!stopConfig) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Pin}
          title="Select Your Stop"
          description="Configure your metro line and stop to see departures."
          actions={
            <ActionPanel>
              <Action
                title="Configure Stop"
                icon={Icon.Gear}
                onAction={() => launchCommand({ name: "onboarding", type: LaunchType.UserInitiated })}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return <DeparturesView apiKey={apiKey} stopConfig={stopConfig} onConfigChange={revalidateConfig} />;
}

function DeparturesView({
  apiKey,
  stopConfig,
  onConfigChange,
}: {
  apiKey: string;
  stopConfig: StopConfig;
  onConfigChange: () => void;
}) {
  const url = `${BASE_URL}/stop_areas/${encodeURIComponent(stopConfig.stopId)}/departures?count=20`;

  const { isLoading, data, error, revalidate } = useFetch<PRIMDeparturesResponse>(url, {
    headers: {
      Accept: "application/json",
      apikey: apiKey,
    },
    onError: (error) => {
      console.error("API Error:", error);
    },
  });

  const departures: ParsedDeparture[] = data?.departures ? parseDepartures(data.departures, stopConfig.lineCode) : [];

  const isFavoriteDirection = (direction: string) => stopConfig.favoriteDirections?.includes(direction) ?? false;

  const sortedDepartures = [...departures].sort((a, b) => {
    if (stopConfig.favoriteDirections && stopConfig.favoriteDirections.length > 0) {
      const aIsFavorite = isFavoriteDirection(a.direction);
      const bIsFavorite = isFavoriteDirection(b.direction);
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
    }
    return a.minutesUntil - b.minutesUntil;
  });

  if (error) {
    const isAuthError = error.message.includes("401");
    const isNotFoundError = error.message.includes("404");
    const errorMessage = isAuthError
      ? "Invalid API key. Please check your preferences."
      : isNotFoundError
        ? "Stop not found. Please reconfigure your stop."
        : `Error: ${error.message}`;

    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error Loading Departures"
          description={errorMessage}
          actions={
            <ActionPanel>
              {isNotFoundError ? (
                <Action
                  title="Reconfigure Stop"
                  icon={Icon.Gear}
                  onAction={async () => {
                    await launchCommand({ name: "onboarding", type: LaunchType.UserInitiated });
                    onConfigChange();
                  }}
                />
              ) : (
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              )}
              {isAuthError && (
                <Action.OpenInBrowser title="Get API Key from PRIM" url={PRIM_SIGNUP_URL} icon={Icon.Globe} />
              )}
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const groupedByDirection = new Map<string, ParsedDeparture[]>();
  for (const departure of sortedDepartures) {
    const key = departure.direction;
    const existing = groupedByDirection.get(key) || [];
    existing.push(departure);
    groupedByDirection.set(key, existing);
  }

  const sortedSections = Array.from(groupedByDirection.entries()).sort(([dirA], [dirB]) => {
    if (stopConfig.favoriteDirections && stopConfig.favoriteDirections.length > 0) {
      const aIsFav = isFavoriteDirection(dirA);
      const bIsFav = isFavoriteDirection(dirB);
      if (aIsFav && !bIsFav) return -1;
      if (!aIsFav && bIsFav) return 1;
    }
    return dirA.localeCompare(dirB, "fr");
  });

  const hasFavorites = stopConfig.favoriteDirections && stopConfig.favoriteDirections.length > 0;
  const directionInfo = hasFavorites ? ` (${stopConfig.favoriteDirections!.length} favorite dir.)` : "";
  const subtitle = `Line ${stopConfig.lineCode} · ${stopConfig.stopName}${directionInfo}`;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter departures..." navigationTitle={subtitle}>
      {sortedDepartures.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Train}
          title="No Departures Found"
          description={`No upcoming departures for Line ${stopConfig.lineCode} at ${stopConfig.stopName}.`}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action
                title="Change Stop"
                icon={Icon.Pencil}
                onAction={async () => {
                  await launchCommand({ name: "onboarding", type: LaunchType.UserInitiated });
                  onConfigChange();
                }}
              />
            </ActionPanel>
          }
        />
      ) : (
        sortedSections.map(([direction, directionDepartures]) => {
          const isFavorite = isFavoriteDirection(direction);
          const sectionTitle = isFavorite ? `★ → ${direction}` : `→ ${direction}`;
          return (
            <List.Section
              key={direction}
              title={sectionTitle}
              subtitle={`${Math.min(directionDepartures.length, 5)} of ${directionDepartures.length} departures`}
            >
              {directionDepartures.slice(0, 5).map((departure) => (
                <DepartureListItem
                  key={departure.id}
                  departure={departure}
                  onRefresh={revalidate}
                  onConfigChange={onConfigChange}
                />
              ))}
            </List.Section>
          );
        })
      )}
    </List>
  );
}

function DepartureListItem({
  departure,
  onRefresh,
  onConfigChange,
}: {
  departure: ParsedDeparture;
  onRefresh: () => void;
  onConfigChange: () => void;
}) {
  const timeUntil = formatMinutesUntil(departure.minutesUntil);
  const absoluteTime = formatTime(departure.departureTime);
  const lineColor = getLineColor(departure.lineColor);

  const icon = getTransportIcon(departure.physicalMode);

  return (
    <List.Item
      icon={{
        source: icon,
        tintColor: lineColor,
      }}
      title={timeUntil}
      subtitle={`at ${absoluteTime}`}
      accessories={[
        departure.isRealTime
          ? { icon: Icon.Clock, tooltip: "Real-time" }
          : { icon: Icon.Calendar, tooltip: "Scheduled" },
        { tag: { value: departure.lineCode, color: Color.Blue } },
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={onRefresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action.CopyToClipboard
            title="Copy Departure Time"
            content={`${departure.lineCode} → ${departure.direction}: ${timeUntil} (${absoluteTime})`}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title="Change Stop"
            icon={Icon.Pencil}
            onAction={async () => {
              await launchCommand({ name: "onboarding", type: LaunchType.UserInitiated });
              onConfigChange();
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          />
        </ActionPanel>
      }
    />
  );
}

function getTransportIcon(physicalMode: string): Icon {
  const mode = physicalMode?.toLowerCase() || "";
  if (mode.includes("metro") || mode.includes("métro")) {
    return Icon.Train;
  }
  if (mode.includes("rer") || mode.includes("train")) {
    return Icon.Train;
  }
  if (mode.includes("bus")) {
    return Icon.Car;
  }
  if (mode.includes("tram")) {
    return Icon.Train;
  }
  return Icon.Train;
}
