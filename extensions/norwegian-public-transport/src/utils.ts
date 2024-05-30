import { Color, Icon, Image } from "@raycast/api";
import {
  DestinationDisplay,
  DirectionType,
  EstimatedCall,
  QuayDeparture,
  QuayLineFavorites,
  StopPlaceQuayDeparturesQuery,
  TransportMode,
  VenueCategory,
} from "./types";
import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const TrainIcon: Image = { source: "transport-modes/Train.svg", tintColor: Color.Red };
const RegionalBusIcon: Image = { source: "transport-modes/Bus.svg", tintColor: Color.Blue };
const LocalBusIcon: Image = { source: "transport-modes/Bus.svg", tintColor: Color.Green };
const CoachIcon: Image = { source: "transport-modes/Bus.svg", tintColor: Color.Purple };
const AirIcon: Image = { source: "transport-modes/Plane.svg", tintColor: Color.Orange };
const WaterIcon: Image = { source: "transport-modes/Ferry.svg", tintColor: Color.Blue };
const TramIcon: Image = { source: "transport-modes/Tram.svg", tintColor: Color.Yellow };
const MetroIcon: Image = { source: "transport-modes/Subway.svg", tintColor: Color.Magenta };
const UnknownIcon: Image = { source: Icon.PlusSquare, tintColor: Color.Blue };

export function getTransportIcon(transportMode?: TransportMode, transportSubmode?: string): Image {
  switch (transportMode) {
    case TransportMode.Rail:
      return TrainIcon;
    case TransportMode.Bus:
      if (transportSubmode === "localBus") {
        return LocalBusIcon;
      }
      return RegionalBusIcon;
    case TransportMode.Coach:
      return CoachIcon;
    case TransportMode.Air:
      return AirIcon;
    case TransportMode.Water:
      return WaterIcon;
    case TransportMode.Tram:
      return TramIcon;
    case TransportMode.Metro:
      return MetroIcon;
    default:
      return UnknownIcon;
  }
}

export function getVenueCategoryIcon(categories: VenueCategory[]): Image {
  if (categories.length === 0) return UnknownIcon;

  // TODO: Make this work for all categories
  const deDupedCategories = [
    ...new Set(categories.map((c) => (c === "busStation" ? "onstreetBus" : c))),
  ];
  if (deDupedCategories.length > 1) {
    if (deDupedCategories.includes("airport")) {
      return AirIcon;
    }
    if (deDupedCategories.includes("railStation")) {
      return TrainIcon;
    }
    if (deDupedCategories.includes("metroStation")) {
      return MetroIcon;
    }
    if (
      deDupedCategories.includes("ferryPort") ||
      deDupedCategories.includes("ferryStop") ||
      deDupedCategories.includes("harbourPort")
    ) {
      return WaterIcon;
    }
    if (deDupedCategories.includes("tramStation") || deDupedCategories.includes("onstreetTram")) {
      return TramIcon;
    }
    return UnknownIcon;
  }

  const category = categories[0];
  switch (category) {
    case "railStation":
    case "vehicleRailInterchange":
      return TrainIcon;
    case "busStation":
    case "onstreetBus":
    case "coachStation":
      return LocalBusIcon;
    case "airport":
      return AirIcon;
    case "ferryPort":
    case "ferryStop":
    case "harbourPort":
      return WaterIcon;
    case "tramStation":
    case "onstreetTram":
      return TramIcon;
    case "metroStation":
      return MetroIcon;
    default:
      return UnknownIcon;
  }
}

export function formatAsClock(isoString: string) {
  const d = new Date(isoString);
  const padTime = (n: number) => n.toString().padStart(2, "0");
  return `${padTime(d.getHours())}:${padTime(d.getMinutes())}`;
}

export function formatAsClockWithSeconds(isoString: string) {
  const d = new Date(isoString);
  const padTime = (n: number) => n.toString().padStart(2, "0");
  return `${padTime(d.getHours())}:${padTime(d.getMinutes())}:${padTime(d.getSeconds())}`;
}

export function getSubModeText(transportSubmode?: string) {
  if (!transportSubmode) return undefined;
  // Split on capital letter
  let subMode = transportSubmode.replace(/([A-Z])/g, " $1").trim();
  // Capitalize first letter
  subMode = subMode.charAt(0).toUpperCase() + subMode.slice(1);
  return subMode;
}

export function formatAsTimestamp(isoString: string) {
  const d = new Date(isoString);
  return `${d.toDateString()}, ${formatAsClockWithSeconds(isoString)}`;
}

export function formatDirection(direction: DirectionType) {
  switch (direction) {
    case "anticlockwise":
      return "Anticlockwise";
    case "clockwise":
      return "Clockwise";
    case "inbound":
      return "Inbound";
    case "outbound":
      return "Outbound";
    case "unknown":
      return undefined;
  }
}

export function getDomainName(url: string) {
  const domain = new URL(url).hostname;
  return domain.startsWith("www.") ? domain.slice(4) : domain;
}

export function formatDestinationDisplay(dd?: DestinationDisplay) {
  if (!dd) return "";
  if (!dd.via || dd.via.length === 0) return dd.frontText ?? "";

  const count = dd.via.length;
  const viaString = dd.via
    .map((v, i) => {
      if (count === 1) return v;
      if (i === count - 1) return `and ${v}`;
      return `${v}, `;
    })
    .join("");
  return `${dd.frontText ?? "Unknown"} via ${viaString}`;
}

export function isFavoriteLine(
  favorites: QuayLineFavorites[],
  lineId: string,
  quayId: string,
): boolean {
  return favorites.some((fQuay) => fQuay.quayId === quayId && fQuay.lineIds.includes(lineId));
}

export function filterFavoritesFromResponse(
  departures: StopPlaceQuayDeparturesQuery | undefined,
  favorites: QuayLineFavorites[],
) {
  if (!departures) return undefined;

  const stopPlaceId = departures.stopPlace?.id;
  if (!stopPlaceId) return departures;

  // Filter out favorites that are not for this stop
  const relevantFavorites = filterFavoritesOnStopPlace(favorites, stopPlaceId);
  if (relevantFavorites.length === 0) return { ...departures, favorites: [] };

  const isFavoriteDeparture = (departure: QuayDeparture) =>
    relevantFavorites.some(
      (f) =>
        f.quayId === departure.id &&
        f.lineIds.includes(departure.estimatedCalls[0]?.serviceJourney.line.id),
    );
  return {
    ...departures,
    favorites: departures.favorites.filter((departure) => isFavoriteDeparture(departure)),
  };
}

/**
 * Filter out favorites that are not for the given stop place
 */
export function filterFavoritesOnStopPlace(
  favorites: QuayLineFavorites[],
  stopPlaceId: string,
): QuayLineFavorites[] {
  return favorites.filter((f) => f.stopPlaceId === stopPlaceId);
}

export const sortEstimatedCallsByTime = (a: EstimatedCall, b: EstimatedCall) =>
  new Date(a.expectedDepartureTime ?? a.aimedDepartureTime).valueOf() -
  new Date(b.expectedDepartureTime ?? b.aimedDepartureTime).valueOf();
