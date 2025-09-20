import { Action, ActionPanel, Icon, Image, Keyboard } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { Feature } from "../types";
import { getWebPlannerConfig } from "../preferences";

type ActionsProps = {
  venue: Feature;
  isFavorite: boolean;
  onAction: () => void;
  onSave: () => void;
  primaryActionTitle: string;
};

export function Actions({ venue, isFavorite, onAction, onSave, primaryActionTitle }: ActionsProps) {
  const webPlannerConfig = getWebPlannerConfig();
  return (
    <ActionPanel>
      <Action title={primaryActionTitle} icon={Icon.ArrowRight} onAction={onAction} />
      <Action
        title={
          isFavorite
            ? `Remove ${venue.properties.name} from Favorites`
            : `Add ${venue.properties.name} to Favorites`
        }
        icon={isFavorite ? Icon.StarDisabled : Icon.Star}
        shortcut={Keyboard.Shortcut.Common.Pin}
        onAction={onSave}
      />
      {venue.properties.id && (
        <Action.OpenInBrowser
          url={`${webPlannerConfig.url}/departures/${venue.properties.id}`}
          title={`Open Stop in ${webPlannerConfig.name}`}
          icon={getFavicon(webPlannerConfig.url, { mask: Image.Mask.RoundedRectangle })}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
      )}
      <Action.OpenInBrowser
        url={getSkjermenUrl(venue)}
        // eslint-disable-next-line @raycast/prefer-title-case
        title="Open Stop in skjer.men"
        icon={getFavicon("https://skjer.men", {
          mask: Image.Mask.RoundedRectangle,
        })}
        shortcut={{ modifiers: ["cmd"], key: "m" }}
      />
    </ActionPanel>
  );
}

function getSkjermenUrl(venue: Feature) {
  const url = `https://skjer.men/${venue.geometry.coordinates[1]}/${venue.geometry.coordinates[0]}`;
  return encodeURI(url);
}
