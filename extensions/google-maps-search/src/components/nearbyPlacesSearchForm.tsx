import { Action, ActionPanel, Form, Icon, openExtensionPreferences, useNavigation } from "@raycast/api";
import { showFailureToast, useForm, useLocalStorage } from "@raycast/utils";
import { OriginOption, PLACE_TYPES } from "../types";
import { useNearbyPlaces } from "../hooks/useNearbyPlaces";
import { getDefaultRadiusInPreferredUnit, getUnitSystem } from "../utils/unitConversions";
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

// Default values for form fields
const DEFAULT_PLACE_TYPE = "restaurant";
const DEFAULT_ORIGIN = OriginOption.Home;
const DEFAULT_CUSTOM_ADDRESS = "";
// Convert default radius to string for form input
const DEFAULT_RADIUS = getDefaultRadiusInPreferredUnit().toString();

// Local storage keys
const STORAGE_KEY = {
  PLACE_TYPE: "last-place-type",
  RADIUS: "last-radius",
  ORIGIN: "last-origin-option",
  CUSTOM_ADDRESS: "last-custom-address",
  OPEN_NOW: "last-open-now",
};

// Error messages
const ERROR_MESSAGES = {
  NO_PLACES_FOUND:
    "No places found matching your criteria. Try increasing the search radius or changing the place type.",
};

/**
 * Form values interface for the NearbyPlacesSearchForm
 */
interface NearbyPlacesFormValues {
  placeType: string;
  origin: string;
  customAddress: string;
  radius: string;
  openNow: boolean;
}

export function NearbyPlacesSearchForm() {
  const { push, pop } = useNavigation();
  const { searchNearbyPlaces, isLoading } = useNearbyPlaces();

  // Use localStorage to persist form values with proper default values
  const { value: savedPlaceType, setValue: setSavedPlaceType } = useLocalStorage<string>(
    STORAGE_KEY.PLACE_TYPE,
    DEFAULT_PLACE_TYPE
  );
  const { value: savedRadius, setValue: setSavedRadius } = useLocalStorage<string>(STORAGE_KEY.RADIUS, DEFAULT_RADIUS);
  const { value: savedOrigin, setValue: setSavedOrigin } = useLocalStorage<string>(STORAGE_KEY.ORIGIN, DEFAULT_ORIGIN);
  const { value: savedCustomAddress, setValue: setSavedCustomAddress } = useLocalStorage<string>(
    STORAGE_KEY.CUSTOM_ADDRESS,
    DEFAULT_CUSTOM_ADDRESS
  );
  const { value: savedOpenNow, setValue: setSavedOpenNow } = useLocalStorage<boolean>(STORAGE_KEY.OPEN_NOW, false);

  // Handle search submission
  const handleSubmit = async (values: NearbyPlacesFormValues) => {
    try {
      // Convert radius to number before using it
      const radiusValue = parseFloat(values.radius);

      // Save form values to localStorage with null/undefined checks
      if (values.placeType) setSavedPlaceType(values.placeType);
      if (values.radius) setSavedRadius(values.radius);
      if (values.origin) setSavedOrigin(values.origin);
      // For custom address, we can save empty string
      setSavedCustomAddress(values.customAddress || DEFAULT_CUSTOM_ADDRESS);
      setSavedOpenNow(values.openNow);

      // Validate origin before proceeding
      if (!values.origin || !(Object.values(OriginOption) as string[]).includes(values.origin)) {
        await showFailureToast({
          title: "Invalid Origin",
          message: "Please select a valid origin option before searching.",
        });
        return;
      }

      // Store the loading state at the time of navigation to prevent race conditions
      const wasLoading = isLoading;
      const places = await searchNearbyPlaces(
        values.placeType,
        values.origin as OriginOption,
        radiusValue,
        values.customAddress,
        values.openNow
      );

      if (places && places.length > 0) {
        const placeNavigation = createPlaceNavigation(push, pop, places, values.placeType);
        // Use the loading state captured before the async operation
        placeNavigation.navigateToResults(wasLoading);
      } else {
        await showFailureToast({
          title: "No places found",
          message: ERROR_MESSAGES.NO_PLACES_FOUND,
        });
      }
    } catch (error: unknown) {
      console.error("Error in handleSubmit:", error);

      if (error instanceof Error && error.message.includes("ZERO_RESULTS")) {
        await showFailureToast({
          title: "No Results Found",
          message: ERROR_MESSAGES.NO_PLACES_FOUND,
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
      placeType: savedPlaceType || DEFAULT_PLACE_TYPE,
      origin: savedOrigin || DEFAULT_ORIGIN,
      customAddress: savedCustomAddress || DEFAULT_CUSTOM_ADDRESS,
      radius: savedRadius || DEFAULT_RADIUS,
      openNow: savedOpenNow,
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
        return undefined;
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
        return undefined;
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
        placeholder={DEFAULT_RADIUS}
        info="Enter a value between 0.5 and 50"
      />

      <Form.Checkbox {...itemProps.openNow} label="Only show places that are open now" />
    </Form>
  );
}
