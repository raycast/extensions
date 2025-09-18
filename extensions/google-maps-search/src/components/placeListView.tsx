import { List, Color } from "@raycast/api";
import { PlaceSearchResult } from "../types";
import { formatRating, formatDistance, calculateDistance } from "../utils/common";
import { PlaceActions } from "./placeActions";
import { useMemo, useState, useEffect, useCallback } from "react";
import { debounce } from "../helpers/debounce";

interface PlaceListViewProps {
  places: PlaceSearchResult[];
  isLoading: boolean;
  onSelectPlace: (placeId: string) => void;
  sectionTitle?: string;
  sectionSubtitle?: string;
  originLocation?: { lat: number; lng: number };
  formatPlaceTypes?: (types: string[]) => string;
}

// Delay in milliseconds before showing the empty view
const EMPTY_VIEW_DELAY = 1000;

export function PlaceListView({
  places,
  isLoading,
  onSelectPlace,
  sectionTitle = "Places",
  sectionSubtitle,
  originLocation,
  formatPlaceTypes = (types) =>
    types
      .slice(0, 3)
      .map((type) => type.replace(/_/g, " "))
      .join(", "),
}: PlaceListViewProps) {
  // State to track whether to show the empty view
  const [showEmptyView, setShowEmptyView] = useState(false);

  // Create a debounced function to set the empty view state
  // This will only be created once when the component mounts
  const debouncedSetEmptyView = useCallback(
    debounce((isEmpty: boolean) => {
      setShowEmptyView(isEmpty);
    }, EMPTY_VIEW_DELAY),
    []
  );

  // Update the empty view state when loading or places change
  useEffect(() => {
    // If loading or we have places, don't show empty view
    if (isLoading || places.length > 0) {
      setShowEmptyView(false);
      return;
    }

    // If not loading and no places, debounce showing the empty view
    debouncedSetEmptyView(true);
  }, [isLoading, places.length, debouncedSetEmptyView]);

  // Memoize distance calculations to avoid recalculating on every render
  const distanceMap = useMemo(() => {
    if (!originLocation) return {};

    // Create a map of placeId -> formatted distance
    return places.reduce<Record<string, string>>((acc, place) => {
      if (place.location) {
        const distance = calculateDistance(
          originLocation.lat,
          originLocation.lng,
          place.location.lat,
          place.location.lng
        );
        acc[place.placeId] = formatDistance(distance);
      }
      return acc;
    }, {});
  }, [places, originLocation]);

  return (
    <List isLoading={isLoading}>
      {places.length === 0 && showEmptyView ? (
        <List.EmptyView title="No places found" />
      ) : (
        <List.Section title={sectionTitle} subtitle={sectionSubtitle || `${places.length} found`}>
          {places.map((place) => (
            <List.Item
              key={place.placeId}
              title={place.name}
              subtitle={place.address}
              accessories={[
                { text: place.rating ? formatRating(place.rating, 3) : undefined },
                { text: place.types && place.types.length > 0 ? formatPlaceTypes(place.types) : undefined },
                {
                  text:
                    place.openNow !== undefined
                      ? place.openNow
                        ? { value: "Open Now", color: Color.Green }
                        : { value: "Closed", color: Color.Red }
                      : undefined,
                },
                {
                  text: originLocation && place.location ? distanceMap[place.placeId] : undefined,
                },
              ]}
              actions={<PlaceActions place={place} onViewDetails={onSelectPlace} />}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
