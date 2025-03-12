import { Action, ActionPanel, Icon, getPreferenceValues } from "@raycast/api";
import { PlaceSearchResult } from "../types";
import { makeDirectionsURL, makeSearchURL } from "../utils/url";
import { Preferences } from "../types";

interface PlaceActionsProps {
  place: PlaceSearchResult;
  onViewDetails: (placeId: string) => void;
  onBack?: () => void;
  preferredMode?: string;
}

export function PlaceActions({ place, onViewDetails, onBack, preferredMode }: PlaceActionsProps) {
  const preferences = getPreferenceValues<Preferences>();
  const mode = preferredMode || preferences.preferredMode || "driving";

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action title="View Details" icon={Icon.Sidebar} onAction={() => onViewDetails(place.placeId)} />
      </ActionPanel.Section>

      <ActionPanel.Section title="Browser">
        <Action.OpenInBrowser
          title="Open in Google Maps"
          url={makeSearchURL(place.name + " " + place.address)}
          icon={Icon.Globe}
        />
        <Action.OpenInBrowser title="Get Directions" url={makeDirectionsURL("", place.address, mode)} icon={Icon.Map} />
      </ActionPanel.Section>

      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard title="Copy Address" content={place.address} icon={Icon.Clipboard} />
        <Action.CopyToClipboard
          title="Copy Coordinates"
          content={`${place.location.lat},${place.location.lng}`}
          icon={Icon.Pin}
        />
      </ActionPanel.Section>

      {onBack && (
        <ActionPanel.Section>
          <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} />
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}
