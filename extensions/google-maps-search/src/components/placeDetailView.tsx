import { useState, useEffect } from "react";
import { Action, ActionPanel, Detail, getPreferenceValues, Icon, Color } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Preferences, PlaceDetails } from "../types";
import { getPlaceDetails } from "../utils/googlePlacesApi";
import { formatPriceLevel, formatRating } from "../utils/common";
import { makeSearchURL } from "../utils/url";
import { PlaceActions } from "./placeActions";
import { renderSingleLocationMap } from "../utils/mapRenderer";

interface PlaceDetailViewProps {
  placeId: string;
  onBack: () => void;
}

export function PlaceDetailView({ placeId, onBack }: PlaceDetailViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [markdown, setMarkdown] = useState("");
  const preferences = getPreferenceValues<Preferences>();

  // Fetch place details when the component mounts
  useEffect(() => {
    async function fetchPlaceDetails() {
      try {
        setIsLoading(true);
        const details = await getPlaceDetails(placeId);
        setPlaceDetails(details);
      } catch (err) {
        showFailureToast("Failed to fetch place details", { message: "Please check your API key." });
      } finally {
        setIsLoading(false);
      }
    }

    fetchPlaceDetails();
  }, [placeId]);

  // Generate markdown for place details
  useEffect(() => {
    if (!placeDetails) return;

    let isMounted = true;

    const googleMapsUrl = makeSearchURL(encodeURIComponent(`${placeDetails.name} ${placeDetails.address}`));

    // Use the new map renderer utility instead of directly calling getStaticMapUrl
    const mapPromise = preferences.showMapInSidebar
      ? renderSingleLocationMap(placeDetails.location, 15, true, `Map of ${placeDetails.name}`, googleMapsUrl)
      : Promise.resolve("");

    // We need to handle the async nature of the map renderer
    let markdown = `# ${placeDetails.name}\n\n`;
    markdown +=
      "### " +
      formatRating(placeDetails.rating, 1, placeDetails.userRatingsTotal) +
      (placeDetails.priceLevel === undefined ? "" : " • " + formatPriceLevel(placeDetails.priceLevel)) +
      "\n\n";
    markdown +=
      placeDetails.types.length > 0
        ? `${placeDetails.types[0].replace(/\b\w/g, (l) => l.toUpperCase()).replace(/_/g, " ")}\n\n`
        : "";

    // Add a placeholder for the map that will be replaced asynchronously
    markdown += preferences.showMapInSidebar ? "[MAP_PLACEHOLDER]\n\n" : "\n\n";

    if (placeDetails.reviews && placeDetails.reviews.length > 0) {
      markdown += "\n*\t*\t*\t\n";
      markdown += "## Top Reviews\n\n";
      placeDetails.reviews.slice(0, 3).forEach((review) => {
        markdown += `### ${review.authorName} - ${formatRating(review.rating)}\n`;
        markdown += `*${review.relativeTimeDescription}*\n\n`;
        markdown += `${review.text}\n\n`;
        markdown += "\n*\t*\t*\t\n";
      });
    }

    setMarkdown(markdown);

    mapPromise
      .then((mapMarkdown) => {
        if (isMounted && mapMarkdown) {
          setMarkdown((prevMarkdown) => {
            return prevMarkdown.replace("[MAP_PLACEHOLDER]", mapMarkdown);
          });
        }
      })
      .catch((error) => {
        if (isMounted) {
          showFailureToast("Failed to render map", { message: error.message });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [placeDetails, preferences.showMapInSidebar]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        placeDetails && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Address" text={placeDetails.address} />
            {placeDetails.phoneNumber && (
              <Detail.Metadata.Link
                title="Phone"
                target={`tel:${placeDetails.phoneNumber}`}
                text={placeDetails.phoneNumber}
              />
            )}
            {placeDetails.website && (
              <Detail.Metadata.Link title="Website" target={placeDetails.website} text="Visit Website" />
            )}
            {placeDetails.openingHours?.isOpen !== undefined && (
              <Detail.Metadata.Label
                title="Status"
                text={placeDetails.openingHours.isOpen ? "Open Now" : "Closed"}
                icon={{
                  source: placeDetails.openingHours.isOpen ? Icon.Checkmark : Icon.XMarkCircle,
                  tintColor: placeDetails.openingHours.isOpen ? Color.Green : Color.Red,
                }}
              />
            )}
            {placeDetails.openingHours?.weekdayText && placeDetails.openingHours.weekdayText.length > 0 && (
              <Detail.Metadata.TagList title="Opening Hours">
                {placeDetails.openingHours.weekdayText.map((day) => (
                  <Detail.Metadata.TagList.Item key={day} text={day} color={Color.PrimaryText} />
                ))}
              </Detail.Metadata.TagList>
            )}
            {placeDetails.types && placeDetails.types.length > 0 && (
              <Detail.Metadata.TagList title="Categories">
                {placeDetails.types.slice(0, 5).map((type) => (
                  <Detail.Metadata.TagList.Item key={type} text={type.replace(/_/g, " ")} color={Color.Blue} />
                ))}
              </Detail.Metadata.TagList>
            )}
            {placeDetails.photos && placeDetails.photos.length > 0 && (
              <Detail.Metadata.Link
                title="Photos"
                text={`${placeDetails.photos.length} available`}
                target={makeSearchURL(encodeURIComponent(`${placeDetails.name} ${placeDetails.address}`))}
              />
            )}
          </Detail.Metadata>
        )
      }
      actions={
        placeDetails ? (
          <PlaceActions
            place={{
              placeId: placeDetails.placeId,
              name: placeDetails.name,
              address: placeDetails.address,
              location: placeDetails.location,
              types: placeDetails.types,
              rating: placeDetails.rating,
              openNow: placeDetails.openingHours?.isOpen,
            }}
            onBack={onBack}
            isDetailView={true}
          />
        ) : (
          <ActionPanel>
            <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} />
          </ActionPanel>
        )
      }
    />
  );
}
