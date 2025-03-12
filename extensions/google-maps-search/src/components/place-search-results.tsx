import { List, Icon, getPreferenceValues, Color } from "@raycast/api";
import { Preferences, PlaceSearchResult } from "../utils/types";
import { PlaceActions } from "./place-actions";

interface PlaceSearchResultsProps {
  places: PlaceSearchResult[];
  isLoading: boolean;
  onSelectPlace: (placeId: string) => void;
  onBack?: () => void;
}

export function PlaceSearchResults({ places, isLoading, onSelectPlace, onBack }: PlaceSearchResultsProps) {
  const preferences = getPreferenceValues<Preferences>();

  // Format place types for display
  const formatPlaceTypes = (types: string[]): string => {
    return types
      .slice(0, 3)
      .map((type) => type.replace(/_/g, " "))
      .join(", ");
  };

  return (
    <List isLoading={isLoading}>
      <List.Section title="Places" subtitle={`${places.length} found`}>
        {places.map((place) => (
          <List.Item
            key={place.placeId}
            title={place.name}
            subtitle={place.address}
            accessories={[
              { text: place.rating ? `★ ${place.rating}` : undefined },
              { text: formatPlaceTypes(place.types) },
              { icon: place.openNow ? { source: Icon.Checkmark, tintColor: Color.Green } : undefined },
            ]}
            actions={
              <PlaceActions
                place={place}
                onViewDetails={onSelectPlace}
                onBack={onBack}
                preferredMode={preferences.preferredMode}
              />
            }
          />
        ))}
      </List.Section>
      <List.EmptyView
        title="Type Query to Search"
        description="Search for places by name, address, or type."
        icon={require("../assets/no-view.png")}
      />
    </List>
  );
}
