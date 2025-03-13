import { List, Color } from "@raycast/api";
import { PlaceSearchResult } from "../types";
import { formatRating, formatDistance, calculateDistance } from "../utils/common";
import { PlaceActions } from "./placeActions";

interface PlaceListViewProps {
  places: PlaceSearchResult[];
  isLoading: boolean;
  onSelectPlace: (placeId: string) => void;
  sectionTitle?: string;
  sectionSubtitle?: string;
  originLocation?: { lat: number; lng: number };
  formatPlaceTypes?: (types: string[]) => string;
}

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
  return (
    <List isLoading={isLoading}>
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
                text:
                  originLocation && place.location
                    ? formatDistance(
                        calculateDistance(
                          originLocation.lat,
                          originLocation.lng,
                          place.location.lat,
                          place.location.lng
                        )
                      )
                    : undefined,
              },
            ]}
            actions={<PlaceActions place={place} onViewDetails={onSelectPlace} />}
          />
        ))}
      </List.Section>
    </List>
  );
}
