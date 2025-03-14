import { Action, ActionPanel, Form, Icon, openExtensionPreferences, useNavigation } from "@raycast/api";
import { showFailureToast, useForm, useLocalStorage } from "@raycast/utils";
import { OriginOption, PLACE_TYPES } from "../types";
import { useNearbyPlaces } from "../hooks/useNearbyPlaces";
import { getDefaultRadius, getUnitSystem } from "../utils/common";
import { createPlaceNavigation } from "../utils/navigation";

/**
 * The NearbyPlacesSearchForm component is a form for the user to input search criteria,
 * which is then used to search for nearby places using the Google Maps API.
 *
 * Features:
 * - Persists form values using localStorage
 * - Validates form values before submission using Raycast's useForm hook
 * - Handles errors and displays appropriate messages
 * - Uses the createPlaceNavigation utility to navigate to search results
 */

/**
 * Form values interface for the NearbyPlacesSearchForm
 */
interface NearbyPlacesFormValues {
  placeType: string;
  origin: string;
  customAddress: string;
  radius: string;
}

export function NearbyPlacesSearchForm() {
  const { push } = useNavigation();
  const { searchNearbyPlaces, isLoading } = useNearbyPlaces();

  // Use localStorage to persist form values
  const { value: savedPlaceType, setValue: setSavedPlaceType } = useLocalStorage<string>(
    "last-place-type",
    "restaurant"
  );
  const { value: savedRadius, setValue: setSavedRadius } = useLocalStorage<string>("last-radius", getDefaultRadius());
  const { value: savedOrigin, setValue: setSavedOrigin } = useLocalStorage<OriginOption>(
    "last-origin-option",
    OriginOption.Home
  );
  const { value: savedCustomAddress, setValue: setSavedCustomAddress } = useLocalStorage<string>(
    "last-custom-address",
    ""
  );

  // Common error messages
  const NO_PLACES_FOUND_MESSAGE =
    "No places found matching your criteria. Try increasing the search radius or changing the place type.";

  // Handle search submission
  const handleSubmit = async (values: NearbyPlacesFormValues) => {
    try {
      // Save form values to localStorage
      setSavedPlaceType(values.placeType);
      setSavedRadius(values.radius);
      setSavedOrigin(values.origin as OriginOption);
      setSavedCustomAddress(values.customAddress);

      const radiusValue = parseFloat(values.radius);

      const places = await searchNearbyPlaces(
        values.placeType,
        values.origin as OriginOption,
        values.customAddress,
        radiusValue
      );

      if (places && places.length > 0) {
        const { navigateToResults } = createPlaceNavigation(push, places, NearbyPlacesSearchForm, values.placeType);
        navigateToResults();
      } else {
        await showFailureToast({
          title: "No places found",
          message: NO_PLACES_FOUND_MESSAGE,
        });
      }
    } catch (error: unknown) {
      console.error("Error in handleSubmit:", error);

      if (error instanceof Error && error.message.includes("ZERO_RESULTS")) {
        await showFailureToast({
          title: "No Results Found",
          message: NO_PLACES_FOUND_MESSAGE,
        });
      } else {
        await showFailureToast({
          title: "Error searching for places",
          message: error instanceof Error ? error.message : "An unknown error occurred",
        });
      }
    }
  };

  // Use the useForm hook for form validation
  const {
    handleSubmit: formSubmit,
    itemProps,
    values,
  } = useForm<NearbyPlacesFormValues>({
    onSubmit: handleSubmit,
    initialValues: {
      placeType: savedPlaceType,
      origin: savedOrigin,
      customAddress: savedCustomAddress,
      radius: savedRadius,
    },
    validation: {
      radius: (value) => {
        if (!value) return "Please enter a radius value";

        const num = parseFloat(value);
        if (isNaN(num)) {
          return "Please enter a valid number";
        }
        if (num < 0.5) {
          return "Radius must be at least 0.5";
        }
        if (num > 50) {
          return "Radius must be at most 50";
        }
      },
      customAddress: (value) => {
        if (values.origin === OriginOption.Custom) {
          // Check if address is empty
          if (!value?.trim()) {
            return "Please enter a custom address";
          }

          // Check for minimum length
          if (value.trim().length < 5) {
            return "Address is too short, please be more specific";
          }

          // Check for address format - should contain at least some alphanumeric characters
          if (!/[a-zA-Z0-9]/.test(value)) {
            return "Address should contain alphanumeric characters";
          }

          // Check for special characters that might cause issues with the API
          if (/[<>{}[\]\\^~`|]/.test(value)) {
            return "Address contains invalid special characters";
          }
        }
      },
    },
  });

  return (
    <Form
      isLoading={isLoading}
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search" icon={Icon.MagnifyingGlass} onSubmit={formSubmit} />
          <Action title="Open Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
        </ActionPanel>
      }
    >
      <Form.Dropdown {...itemProps.placeType} title="Type of Places">
        {PLACE_TYPES.map((type) => (
          <Form.Dropdown.Item key={type.value} value={type.value} title={type.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown {...itemProps.origin} title="Search Near">
        <Form.Dropdown.Item value={OriginOption.Home} title="Home Address" icon={Icon.House} />
        <Form.Dropdown.Item value={OriginOption.Custom} title="Custom Address" icon={Icon.Pencil} />
      </Form.Dropdown>

      {values.origin === OriginOption.Custom && (
        <Form.TextField {...itemProps.customAddress} title="Custom Address" placeholder="Enter address" />
      )}

      <Form.TextField
        {...itemProps.radius}
        title={`Search Radius (${getUnitSystem() === "imperial" ? "miles" : "km"})`}
        placeholder={getDefaultRadius()}
        info="Enter a value between 0.5 and 50"
      />
    </Form>
  );
}
