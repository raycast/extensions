// External library imports
import { Navigation } from "@raycast/api";

// Internal type exports
import { PlaceSearchResult } from "../types";
import { PlaceSearchResults } from "../components/placeSearchResults";
import { PlaceDetailView } from "../components/placeDetailView";

/**
 * Creates navigation functions for handling place search results and details
 * @param push Navigation push function from useNavigation hook
 * @param pop Navigation pop function from useNavigation hook
 * @param places Array of place search results
 * @param placeType Optional place type that was searched for
 * @returns Object containing navigation functions
 */
export function createPlaceNavigation(
  push: Navigation["push"],
  pop: () => void,
  places: PlaceSearchResult[],
  placeType?: string
): {
  /**
   * Navigates to the search results list
   * @param isLoading Whether results are still loading
   */
  navigateToResults: (isLoading: boolean) => void;
  navigateToDetails: (selectedPlaceId: string) => void;
} {
  /**
   * Navigates to the search results list
   * @param isLoading Whether results are still loading
   */
  const navigateToResults = (isLoading: boolean) => {
    push(
      <PlaceSearchResults
        places={places}
        isLoading={isLoading}
        onSelectPlace={(selectedPlaceId) => navigateToDetails(selectedPlaceId)}
        onBack={() => pop()}
        placeType={placeType}
      />
    );
  };

  // Navigate to place details with a simplified back function
  const navigateToDetails = (selectedPlaceId: string) => {
    push(<PlaceDetailView placeId={selectedPlaceId} onBack={() => navigateToResults(false)} />);
  };

  return {
    navigateToResults,
    navigateToDetails,
  };
}
