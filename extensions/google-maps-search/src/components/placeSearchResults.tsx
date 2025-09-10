import { List, Icon, getPreferenceValues, Color } from "@raycast/api";
import { Preferences, PlaceSearchResult } from "../types";
import { PlaceActions } from "./placeActions";
import { PLACE_TYPES } from "../types/places";

interface PlaceSearchResultsProps {
  places: PlaceSearchResult[];
  isLoading: boolean;
  onSelectPlace: (placeId: string) => void;
  onBack?: () => void;
  placeType?: string;
}

export function PlaceSearchResults({ places, isLoading, onSelectPlace, onBack, placeType }: PlaceSearchResultsProps) {
  const preferences = getPreferenceValues<Preferences>();

  // Format place types for display
  const formatPlaceTypes = (types: string[]): string => {
    if (!types || !Array.isArray(types)) return "";

    return types
      .slice(0, 3)
      .filter((type): type is string => typeof type === "string") // Filter out non-string values
      .map((type) => type.replace(/_/g, " "))
      .join(", ");
  };

  // Format place type for display in title
  const formatPlaceTypeTitle = (type?: string | null): string => {
    // Return default value if type is not a valid string
    if (!type || typeof type !== "string") return "Places";

    // Find the place type in the predefined list and use its plural form
    const placeTypeOption = PLACE_TYPES.find((option) => option.value === type);
    if (placeTypeOption && placeTypeOption.plural) {
      return placeTypeOption.plural;
    }

    try {
      // Fallback for custom types not in the predefined list
      // Convert from camelCase or snake_case and capitalize first letter of each word
      const formatted = type
        .replace(/_/g, " ")
        .replace(/([A-Z])/g, " $1")
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());

      // Simple pluralization for fallback
      if (formatted.endsWith("y")) {
        return formatted.slice(0, -1) + "ies";
      } else if (!formatted.endsWith("s")) {
        return formatted + "s";
      }

      return formatted;
    } catch (error) {
      console.error(`Error formatting place type: ${type}`, error);
      return "Places";
    }
  };

  const sectionTitle = formatPlaceTypeTitle(placeType);

  return (
    <List isLoading={isLoading}>
      <List.Section title={sectionTitle} subtitle={`${places.length} found`}>
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
      {places.length === 0 && !isLoading && (
        <List.EmptyView
          title="Type Query to Search"
          description="Search for places by name, address, or type."
          icon={{ source: "no-view.png" }}
        />
      )}
    </List>
  );
}
