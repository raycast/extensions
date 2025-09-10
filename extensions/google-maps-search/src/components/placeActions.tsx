import { Action, ActionPanel, Icon, getPreferenceValues } from "@raycast/api";
import { PlaceSearchResult, Preferences } from "../types";
import { makeDirectionsURL } from "../utils/url";

interface PlaceActionsProps {
  place: PlaceSearchResult;
  onViewDetails?: (placeId: string) => void;
  onBack?: () => void;
  preferredMode?: string;
  isDetailView?: boolean;
}

export function PlaceActions({ place, onViewDetails, onBack, preferredMode, isDetailView }: PlaceActionsProps) {
  const preferences = getPreferenceValues<Preferences>();
  const mode = preferredMode || preferences.preferredMode || "driving";

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {!isDetailView && onViewDetails && (
          <Action title="View Details" icon={Icon.Sidebar} onAction={() => onViewDetails(place.placeId)} />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Browser">
        <Action.OpenInBrowser
          title="Open in Google Maps"
          url={`https://www.google.com/maps/place?q=place_id:${place.placeId}`}
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
        <Action.OpenInBrowser
          title="Get Directions"
          url={makeDirectionsURL("", place.address, mode)}
          icon={Icon.Map}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard
          title="Copy Address"
          content={place.address}
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        <Action.CopyToClipboard
          title="Copy Google Maps URL"
          content={`https://www.google.com/maps/place?q=place_id:${place.placeId}`}
          icon={Icon.Link}
          shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
        />
        <Action.CopyToClipboard
          title="Copy Coordinates"
          content={`${place.location.lat},${place.location.lng}`}
          icon={Icon.Pin}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
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
