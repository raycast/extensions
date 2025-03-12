import { useState, useEffect } from "react";
import {
  Action,
  ActionPanel,
  List,
  Icon,
  getPreferenceValues,
  showToast,
  Toast,
  openExtensionPreferences,
  Color,
  Form,
  useNavigation,
  LocalStorage,
} from "@raycast/api";
import { Preferences, OriginOption, PlaceSearchResult, PLACE_TYPES } from "./types";
import { SortOrder } from "./utils/types";
import { geocodeAddress, getNearbyPlaces } from "./utils/google-places-api";
import { makeDirectionsURL, makeSearchURL } from "./utils/url";
import { getUnitSystem, getDefaultRadius, formatRating, calculateDistance, formatDistance } from "./utils/common";
import { PlaceDetailView } from "./components/place-detail-view";

// Sort places based on the specified sort order
function sortPlaces(
  places: PlaceSearchResult[],
  sortOrder: SortOrder,
  originLocation?: { lat: number; lng: number }
): PlaceSearchResult[] {
  if (sortOrder === "none" || places.length === 0) {
    return places;
  }

  return [...places].sort((a, b) => {
    if (sortOrder === "proximity" && originLocation) {
      const distanceA = calculateDistance(originLocation.lat, originLocation.lng, a.location.lat, a.location.lng);
      const distanceB = calculateDistance(originLocation.lat, originLocation.lng, b.location.lat, b.location.lng);
      return distanceA - distanceB;
    } else if (sortOrder === "rating") {
      // Sort by rating (highest first), handle undefined ratings
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      return ratingB - ratingA;
    } else if (sortOrder === "price") {
      // Sort by price level (lowest first), handle undefined price levels
      const priceA = a.priceLevel !== undefined ? a.priceLevel : Number.MAX_SAFE_INTEGER;
      const priceB = b.priceLevel !== undefined ? b.priceLevel : Number.MAX_SAFE_INTEGER;
      return priceA - priceB;
    }
    return 0;
  });
}

// Filter places to show only open ones if requested
function filterOpenPlaces(places: PlaceSearchResult[], showOnlyOpen: boolean): PlaceSearchResult[] {
  if (!showOnlyOpen) {
    return places;
  }
  return places.filter((place) => place.openNow === true);
}

// Component to display search results
function SearchResultsView({
  places,
  isLoading,
  onSelectPlace,
  onBack,
  selectedPlaceType,
  originLocation,
  sortOrder,
  showOnlyOpen,
}: {
  places: PlaceSearchResult[];
  isLoading: boolean;
  onSelectPlace: (placeId: string) => void;
  onBack: () => void;
  selectedPlaceType: string;
  originLocation?: { lat: number; lng: number };
  sortOrder: SortOrder;
  showOnlyOpen: boolean;
}) {
  const preferences = getPreferenceValues<Preferences>();

  // Get plural form of place type
  const getPlaceTypePlural = (type: string): string => {
    if (!type) return "Places";

    // Find the place type in PLACE_TYPES array
    const placeType = PLACE_TYPES.find((pt) => pt.value === type);

    // Return the plural form if found, otherwise format the type string
    return placeType?.plural || type.replace(/_/g, " ") + "s";
  };

  // Get the section title based on the selected place type
  const getSectionTitle = (): string => {
    if (places.length === 0) return "Places";

    // Use the selected place type from the search form
    return `Nearby ${getPlaceTypePlural(selectedPlaceType)}`;
  };

  // Apply filtering and sorting
  const filteredPlaces = filterOpenPlaces(places, showOnlyOpen);
  const sortedPlaces = sortPlaces(filteredPlaces, sortOrder, originLocation);

  return (
    <List isLoading={isLoading}>
      <List.Section title={getSectionTitle()} subtitle={`${sortedPlaces.length} found`}>
        {sortedPlaces.map((place) => (
          <List.Item
            key={place.placeId}
            title={place.name}
            subtitle={place.address}
            accessories={[
              { text: place.rating ? formatRating(place.rating, 3) : undefined },
              {
                text:
                  place.openNow !== undefined
                    ? place.openNow
                      ? { value: "Open Now", color: Color.Green }
                      : { value: "Closed", color: Color.Red }
                    : undefined,
              },
              {
                text: originLocation
                  ? formatDistance(
                      calculateDistance(originLocation.lat, originLocation.lng, place.location.lat, place.location.lng)
                    )
                  : undefined,
              },
            ]}
            actions={
              <ActionPanel>
                <Action title="View Details" icon={Icon.Sidebar} onAction={() => onSelectPlace(place.placeId)} />
                <Action.OpenInBrowser
                  title="Open in Google Maps"
                  url={makeSearchURL(place.name + " " + place.address)}
                  icon={Icon.Globe}
                />
                <Action.OpenInBrowser
                  title="Get Directions"
                  url={makeDirectionsURL("", place.address, preferences.preferredMode)}
                  icon={Icon.Map}
                />
                <Action.CopyToClipboard title="Copy Address" content={place.address} icon={Icon.Clipboard} />
                <Action.CopyToClipboard
                  title="Copy Coordinates"
                  content={`${place.location.lat},${place.location.lng}`}
                  icon={Icon.Pin}
                />
                <Action title="Back to Search" icon={Icon.ArrowLeft} onAction={onBack} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

/**
 * Component for the search form.
 *
 * This component allows the user to input search parameters, such as the type of places to search for, the search radius, the origin (home address or custom address), and whether to only show open places.
 *
 * The component is wrapped in a navigation context, which provides the `push` function. When the search form is submitted, the `push` function is called with a new `SearchResultsView` component as its argument.
 *
 * The component also handles the loading of saved search settings from LocalStorage, and saves the current search settings to LocalStorage when the form is submitted.
 */
function SearchForm(): JSX.Element {
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const [placeType, setPlaceType] = useState<string>("restaurant");

  // Load all saved search settings from LocalStorage when component mounts
  useEffect(() => {
    const loadSavedSettings = async () => {
      // Load saved place type
      const savedPlaceType = await LocalStorage.getItem<string>("last-place-type");
      if (savedPlaceType) {
        setPlaceType(savedPlaceType);
      }

      // Load saved radius
      const savedRadius = await LocalStorage.getItem<string>("last-radius");
      if (savedRadius) {
        setRadius(savedRadius);
      }

      // Load saved origin location
      const savedOriginLocation = await LocalStorage.getItem<string>("last-origin");
      if (savedOriginLocation) {
        try {
          const parsedOrigin = JSON.parse(savedOriginLocation);
          if (parsedOrigin) {
            // If we have a saved origin, we were using a custom address
            setOrigin(OriginOption.Custom);
          }
        } catch (error) {
          console.error("Error parsing saved origin location:", error);
        }
      }

      // Load saved custom address
      const savedCustomAddress = await LocalStorage.getItem<string>("last-custom-address");
      if (savedCustomAddress) {
        setCustomAddress(savedCustomAddress);
      }

      // Load saved sort order
      const savedSortOrder = await LocalStorage.getItem<string>("last-sort-order");
      if (
        savedSortOrder &&
        (savedSortOrder === "none" ||
          savedSortOrder === "distance" ||
          savedSortOrder === "rating" ||
          savedSortOrder === "price")
      ) {
        setSortOrder(savedSortOrder as SortOrder);
      }

      // Load saved show only open setting
      const savedShowOnlyOpen = await LocalStorage.getItem<string>("last-show-only-open");
      if (savedShowOnlyOpen) {
        setShowOnlyOpen(savedShowOnlyOpen === "true");
      }
    };

    loadSavedSettings();
  }, []);
  // Use the preferred origin from preferences
  const [origin, setOrigin] = useState<OriginOption>(preferences.preferredOrigin);
  // Wrapper function to handle string to OriginOption conversion for the dropdown
  const handleOriginChange = (newValue: string) => {
    setOrigin(newValue as OriginOption);
  };
  const [customAddress, setCustomAddress] = useState<string>("");
  const [radius, setRadius] = useState<string>(getDefaultRadius());
  const [showOnlyOpen, setShowOnlyOpen] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("none");

  // Handle search submission
  const handleSubmit = async () => {
    try {
      // Check if API key is set
      if (!preferences.googlePlacesApiKey) {
        showToast({
          style: Toast.Style.Failure,
          title: "API Key Missing",
          message: "Please set your Google Places API key in preferences",
          primaryAction: {
            title: "Open Preferences",
            onAction: () => openExtensionPreferences(),
          },
        });
        return;
      }

      // Show loading toast
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Searching for nearby places...",
      });

      // Determine the search location
      let searchLocation: { lat: number; lng: number } | null = null;
      if (origin === OriginOption.Home) {
        // Use home address
        searchLocation = await geocodeAddress(preferences.homeAddress);
        if (!searchLocation) {
          toast.style = Toast.Style.Failure;
          toast.title = "Geocoding Failed";
          toast.message = "Could not find coordinates for your home address";
          return;
        }
      } else if (origin === OriginOption.Custom) {
        // Use custom address
        if (!customAddress.trim()) {
          toast.style = Toast.Style.Failure;
          toast.title = "Missing Address";
          toast.message = "Please enter a custom address";
          return;
        }
        searchLocation = await geocodeAddress(customAddress);
        if (!searchLocation) {
          toast.style = Toast.Style.Failure;
          toast.title = "Geocoding Failed";
          toast.message = "Could not find coordinates for the provided address";
          return;
        }
      }

      // Ensure we have a valid location before proceeding
      if (!searchLocation) {
        toast.style = Toast.Style.Failure;
        toast.title = "Location Error";
        toast.message = "Could not determine search location";
        return;
      }

      // Search for nearby places
      const radiusValue = parseInt(radius, 10);
      const places = await getNearbyPlaces(searchLocation, placeType, radiusValue);

      // Save all search settings to LocalStorage
      await LocalStorage.setItem("last-place-type", placeType);
      await LocalStorage.setItem("last-radius", radiusValue.toString());
      await LocalStorage.setItem("last-origin", JSON.stringify(searchLocation));
      await LocalStorage.setItem("last-custom-address", customAddress || "");
      await LocalStorage.setItem("last-sort-order", sortOrder);
      await LocalStorage.setItem("last-show-only-open", showOnlyOpen.toString());

      // Update toast
      toast.style = Toast.Style.Success;
      toast.title = "Search Complete";
      toast.message = `Found ${places.length} places`;

      // Navigate to results view
      push(
        <SearchResultsView
          places={places}
          isLoading={false}
          selectedPlaceType={placeType}
          originLocation={searchLocation || undefined}
          sortOrder={sortOrder}
          showOnlyOpen={showOnlyOpen}
          onSelectPlace={(placeId) => {
            // When a place is selected, show its details
            push(
              <PlaceDetailView
                placeId={placeId}
                onBack={() => {
                  // When back is pressed, return to the search results
                  push(
                    <SearchResultsView
                      places={places}
                      isLoading={false}
                      selectedPlaceType={placeType}
                      originLocation={searchLocation || undefined}
                      sortOrder={sortOrder}
                      showOnlyOpen={showOnlyOpen}
                      onSelectPlace={(id) => push(<PlaceDetailView placeId={id} onBack={() => push(<SearchForm />)} />)}
                      onBack={() => push(<SearchForm />)}
                    />
                  );
                }}
              />
            );
          }}
          onBack={() => {
            // Save the current search settings to LocalStorage
            LocalStorage.setItem("last-place-type", placeType);
            LocalStorage.setItem("last-radius", radius);
            LocalStorage.setItem("last-origin", JSON.stringify(origin));
            LocalStorage.setItem("last-custom-address", customAddress || "");
            LocalStorage.setItem("last-sort-order", sortOrder);
            LocalStorage.setItem("last-show-only-open", showOnlyOpen.toString());
            push(<SearchForm />);
          }}
        />
      );
    } catch (error) {
      console.error("Error searching for nearby places:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Search Failed",
        message: "Failed to search for nearby places. Check your API key and network connection.",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search" icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} />
          <Action title="Open Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="placeType" title="Type of Places" value={placeType} onChange={setPlaceType}>
        {PLACE_TYPES.map((type: { value: string; title: string }) => (
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
        title={`Search Radius (${getUnitSystem() === "imperial" ? "miles" : "km"})`}
        placeholder={getDefaultRadius()}
        value={radius}
        onChange={setRadius}
      />

      <Form.Dropdown
        id="sortOrder"
        title="Sort Results By"
        value={sortOrder}
        onChange={(value) => setSortOrder(value as SortOrder)}
      >
        <Form.Dropdown.Item value="none" title="Default (Google's ranking)" />
        <Form.Dropdown.Item value="distance" title="Distance" />
        <Form.Dropdown.Item value="rating" title="Rating (highest first)" />
        <Form.Dropdown.Item value="price" title="Price (lowest first)" />
      </Form.Dropdown>

      <Form.Checkbox id="showOnlyOpen" label="Only Show Open Now" value={showOnlyOpen} onChange={setShowOnlyOpen} />
    </Form>
  );
}

export default function NearbyPlacesCommand() {
  return <SearchForm />;
}
