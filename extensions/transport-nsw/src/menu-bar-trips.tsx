import { MenuBarExtra, launchCommand, LaunchType, Icon, Cache, LocalStorage } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { planTrip, Journey } from "./api";
import { SavedTrip, TransportMode } from "./types";

interface TripWithJourneys {
  id: string;
  name: string;
  origin: { id: string; name: string };
  destination: { id: string; name: string };
  journeys: Journey[];
  error?: string;
}

function formatTime(isoString?: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatTimeUntil(isoString?: string): string {
  if (!isoString) return "";
  const departureTime = new Date(isoString);
  const now = new Date();
  const diffMs = departureTime.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins <= 0) return "Due";
  if (diffMins === 1) return "1 min";
  if (diffMins < 60) return `${diffMins} min`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  if (mins === 0) return hours === 1 ? "1 hr" : `${hours} hrs`;
  return `${hours} hr ${mins} min`;
}

const cache = new Cache();
const SAVED_TRIPS_KEY = "savedTrips";
const CACHED_JOURNEYS_KEY = "menuBarJourneys";

function getSavedTrips(): SavedTrip[] {
  const stored = cache.get(SAVED_TRIPS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

function getCachedJourneys(): TripWithJourneys[] {
  const stored = cache.get(CACHED_JOURNEYS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

export default function Command() {
  // Load instantly from cache (synchronous)
  const initialTrips = getSavedTrips();
  const cachedJourneys = getCachedJourneys();

  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>(initialTrips);
  const [tripsWithJourneys, setTripsWithJourneys] = useState<TripWithJourneys[]>(cachedJourneys);
  const [isLoading, setIsLoading] = useState(cachedJourneys.length === 0 && initialTrips.length > 0);

  // Take only first 3 saved trips (showing 5 departures each)
  const displayTrips = savedTrips.slice(0, 3);

  // Sync from LocalStorage (in case trips were saved by AI tool or before cache existed)
  useEffect(() => {
    LocalStorage.getItem<string>(SAVED_TRIPS_KEY).then((stored) => {
      if (stored) {
        try {
          const trips = JSON.parse(stored);
          cache.set(SAVED_TRIPS_KEY, stored); // Sync to cache
          setSavedTrips(trips);
        } catch {
          // ignore
        }
      }
    });
  }, []);

  useEffect(() => {
    if (displayTrips.length === 0) {
      setIsLoading(false);
      return;
    }

    async function loadJourneys() {
      // Load trips sequentially to avoid rate limits
      const results: TripWithJourneys[] = [];
      const allowedModes: number[] = [TransportMode.Train, TransportMode.Metro, TransportMode.LightRail];

      for (const trip of displayTrips) {
        try {
          const response = await planTrip(trip.origin.id, trip.destination.id, { quick: true });
          // Filter to rail-only journeys
          const railOnly = (response.journeys || []).filter((journey) =>
            journey.legs.every((leg) => {
              if (!leg.transportation) return true; // Walking is fine
              const mode = leg.transportation.product?.class;
              return mode === undefined || allowedModes.includes(mode);
            }),
          );
          const journeys = railOnly
            .sort((a, b) => {
              const aTime = a.legs[0]?.origin.departureTimePlanned || "";
              const bTime = b.legs[0]?.origin.departureTimePlanned || "";
              return aTime.localeCompare(bTime);
            })
            .slice(0, 5);

          results.push({ ...trip, journeys });
        } catch (err) {
          results.push({
            ...trip,
            journeys: [],
            error: err instanceof Error ? err.message : "Failed to load",
          });
        }
      }

      // Cache the results for next time
      cache.set(CACHED_JOURNEYS_KEY, JSON.stringify(results));
      setTripsWithJourneys(results);
      setIsLoading(false);
    }

    loadJourneys();
  }, [displayTrips.length]);

  const handleOpenTrip = async () => {
    await launchCommand({
      name: "plan-trip",
      type: LaunchType.UserInitiated,
    });
  };

  if (displayTrips.length === 0) {
    return (
      <MenuBarExtra icon="train.png" tooltip="Transport NSW - No saved trips">
        <MenuBarExtra.Item title="No saved trips" icon={Icon.Star} />
        <MenuBarExtra.Separator />
        <MenuBarExtra.Item
          title="Plan a Trip..."
          icon={Icon.MagnifyingGlass}
          onAction={() => launchCommand({ name: "plan-trip", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra icon="train.png" isLoading={isLoading} tooltip="Transport NSW">
      {tripsWithJourneys.map((trip, tripIndex) => (
        <React.Fragment key={trip.id}>
          {tripIndex > 0 && <MenuBarExtra.Separator />}
          <MenuBarExtra.Item title={trip.name} />
          {trip.error ? (
            <MenuBarExtra.Item title={`Error: ${trip.error}`} icon={Icon.ExclamationMark} />
          ) : trip.journeys.length === 0 ? (
            <MenuBarExtra.Item title="No upcoming trips" icon={Icon.Clock} />
          ) : (
            trip.journeys.map((journey, index) => {
              const firstLeg = journey.legs[0];
              const lastLeg = journey.legs[journey.legs.length - 1];
              const departTime = formatTime(firstLeg?.origin.departureTimePlanned);
              const arriveTime = formatTime(lastLeg?.destination.arrivalTimePlanned);
              const timeUntil = formatTimeUntil(firstLeg?.origin.departureTimePlanned);
              const firstTransportLeg = journey.legs.find((leg) => leg.transportation);
              const lineName = firstTransportLeg?.transportation?.disassembledName || "";

              return (
                <MenuBarExtra.Item
                  key={index}
                  title={`${timeUntil}  ${departTime} → ${arriveTime}`}
                  subtitle={lineName}
                  onAction={handleOpenTrip}
                />
              );
            })
          )}
        </React.Fragment>
      ))}
    </MenuBarExtra>
  );
}
