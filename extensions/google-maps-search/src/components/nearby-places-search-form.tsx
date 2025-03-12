import { useState } from "react";
import { Action, ActionPanel, Form, Icon, openExtensionPreferences, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { OriginOption, PLACE_TYPES } from "../utils/types";
import { useNearbyPlaces } from "../hooks/use-nearby-places";
import { getUnitSystem, getDefaultRadius } from "../utils/common";
import { createPlaceNavigation } from "../utils/navigation";

/**
 * The NearbyPlacesSearchForm component is a form for the user to input search criteria,
 * such as the type of places to search for, the search radius, the origin (home address or custom address),
 * and whether to only show open places.
 *
 * This component is wrapped in a navigation context, which provides the `push` function. When the search form is submitted,
 * the `push` function is called with a new `SearchResultsView` component as its argument.
 *
 * The component also handles the loading of saved search settings from LocalStorage, and saves the current search settings to
 * LocalStorage when the form is submitted.
 */
export function NearbyPlacesSearchForm() {
  const { push } = useNavigation();
  const { searchNearbyPlaces, isLoading } = useNearbyPlaces();

  const [placeType, setPlaceType] = useState<string>("restaurant");
  const [origin, setOrigin] = useState<OriginOption>(OriginOption.Home);

  // Handle origin change with proper type conversion
  const handleOriginChange = (newValue: string) => {
    setOrigin(newValue as OriginOption);
  };

  // Get user's preferred unit system and default radius
  const unitSystem = getUnitSystem();
  const [radius, setRadius] = useState<string>(getDefaultRadius());

  const [customAddress, setCustomAddress] = useState<string>("");

  // Handle search submission
  const handleSubmit = async () => {
    try {
      // Validate custom address is set when origin is Custom
      if (origin === OriginOption.Custom && !customAddress.trim()) {
        await showFailureToast({
          title: "Missing Address",
          message: "Please enter a custom address before searching",
        });
        return;
      }

      // Validate radius is a positive number
      const radiusValue = parseInt(radius, 10);
      if (isNaN(radiusValue) || radiusValue <= 0) {
        await showFailureToast({
          title: "Invalid Radius",
          message: "Please enter a valid positive number for the radius",
        });
        return;
      }

      const places = await searchNearbyPlaces(placeType, origin, customAddress, radiusValue);

      if (places && places.length > 0) {
        // Use the navigation utility to create navigation functions
        const { navigateToResults } = createPlaceNavigation(push, places, NearbyPlacesSearchForm);

        // Initial navigation to results
        navigateToResults();
      } else {
        await showFailureToast({
          title: "No places found",
          message:
            "No places found for the given search criteria. Try increasing the radius or changing the place type.",
        });
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);

      // Handle specific error cases
      if (error instanceof Error) {
        const errorMessage = error.message || "";

        if (errorMessage.includes("ZERO_RESULTS")) {
          await showFailureToast({
            title: "No Results Found",
            message:
              "No places found matching your criteria. Try increasing the search radius or changing the place type.",
          });
        } else {
          await showFailureToast({
            title: "Error searching for places",
            message: errorMessage || "An unknown error occurred",
          });
        }
      } else {
        await showFailureToast({
          title: "Error searching for places",
          message: "An unknown error occurred",
        });
      }
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search" icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} />
          <Action title="Open Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="placeType" title="Type of Places" value={placeType} onChange={setPlaceType}>
        {PLACE_TYPES.map((type) => (
          <Form.Dropdown.Item key={type.value} value={type.value} title={type.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="origin" title="Search Near" value={origin} onChange={handleOriginChange}>
        <Form.Dropdown.Item value={OriginOption.Home} title="Home Address" icon={Icon.House} />
        <Form.Dropdown.Item value={OriginOption.Custom} title="Custom Address" icon={Icon.Pencil} />
      </Form.Dropdown>

      {origin === OriginOption.Custom && (
        <Form.TextField
          id="customAddress"
          title="Custom Address"
          placeholder="Enter address"
          value={customAddress}
          onChange={setCustomAddress}
        />
      )}

      <Form.TextField
        id="radius"
        title={`Search Radius (${unitSystem === "imperial" ? "miles" : "km"})`}
        placeholder={getDefaultRadius()}
        value={radius}
        onChange={setRadius}
      />
    </Form>
  );
}
