import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useMemo } from "react";
import { showFailureToast, useCachedPromise, useFetch } from "@raycast/utils";
import { locationsUrl } from "./api";
import { getCoords, LocationUnavailableError } from "./location";
import { Location } from "./types";
import { availabilityColor, haversine } from "./utils";
import ChargepointsList from "./components/ChargepointsList";

export default function Command() {
  const {
    data: coords,
    isLoading: coordsLoading,
    error: coordsError,
    revalidate: revalidateCoords,
  } = useCachedPromise(getCoords);

  const url = coords ? locationsUrl(coords.lat, coords.lon) : "";
  const {
    data: locations,
    isLoading: listLoading,
    error: listError,
    revalidate,
  } = useFetch<Location[]>(url, {
    execute: Boolean(url),
    keepPreviousData: true,
  });

  const isLoading = coordsLoading || listLoading;

  const sorted = useMemo(() => {
    if (!locations) return [];
    const own = locations.filter((l) => l.platform === "spirii");
    return [...own].sort((a, b) => {
      if (!coords) return 0;
      const da = haversine(
        coords.lat,
        coords.lon,
        a.coordinates.latitude,
        a.coordinates.longitude,
      );
      const db = haversine(
        coords.lat,
        coords.lon,
        b.coordinates.latitude,
        b.coordinates.longitude,
      );
      return da - db;
    });
  }, [locations, coords]);

  useEffect(() => {
    if (listError)
      showFailureToast(listError, { title: "Could not load chargers" });
  }, [listError]);

  const retry = () => {
    revalidateCoords();
    if (url) revalidate();
  };

  if (coordsError instanceof LocationUnavailableError) {
    const notInstalled = coordsError.reason === "not_installed";
    return (
      <List>
        <List.EmptyView
          icon={Icon.Geopin}
          title={notInstalled ? "Location not available" : "GPS unavailable"}
          description={
            notInstalled
              ? "Install CoreLocationCLI (brew install corelocationcli) for GPS, or set a manual latitude/longitude in preferences."
              : `${coordsError.message}\n\nTry again, or set a manual latitude/longitude in preferences.`
          }
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
              {notInstalled && (
                <Action.OpenInBrowser
                  title="View Corelocationcli on GitHub"
                  url="https://github.com/fulldecent/corelocationcli"
                />
              )}
              <Action
                title="Retry"
                icon={Icon.RotateClockwise}
                onAction={retry}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (listError && sorted.length === 0 && !isLoading) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load chargers"
          description={listError.message ?? "Network error"}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.RotateClockwise}
                onAction={retry}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search chargers…">
      {sorted.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Plug}
          title="No nearby chargers"
          description="No Spirii Go locations found near your current position."
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ) : (
        sorted.map((loc) => {
          const distanceKm = coords
            ? haversine(
                coords.lat,
                coords.lon,
                loc.coordinates.latitude,
                loc.coordinates.longitude,
              )
            : null;
          return (
            <List.Item
              key={loc.id}
              icon={{
                source: Icon.Plug,
                tintColor: availabilityColor(loc.available, loc.evseCount),
              }}
              title={loc.name}
              subtitle={`${loc.address}, ${loc.zipCode} ${loc.city}`}
              accessories={[
                { tag: { value: `${loc.power.max} kW`, color: Color.Blue } },
                ...(distanceKm !== null
                  ? [
                      {
                        text:
                          distanceKm < 1
                            ? `${Math.round(distanceKm * 1000)} m`
                            : `${distanceKm.toFixed(1)} km`,
                      },
                    ]
                  : []),
                {
                  tag: {
                    value: `${loc.available}/${loc.evseCount} available`,
                    color: availabilityColor(loc.available, loc.evseCount),
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Chargepoints"
                    icon={Icon.List}
                    target={<ChargepointsList location={loc} />}
                  />
                  <Action.OpenInBrowser
                    title="Open in Maps"
                    url={`https://maps.apple.com/?q=${encodeURIComponent(loc.name)}&ll=${loc.coordinates.latitude},${loc.coordinates.longitude}`}
                  />
                  <Action.CopyToClipboard
                    title="Copy Location ID"
                    content={loc.id}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    onAction={() => revalidate()}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action
                    title="Open Extension Preferences"
                    icon={Icon.Gear}
                    onAction={openExtensionPreferences}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
