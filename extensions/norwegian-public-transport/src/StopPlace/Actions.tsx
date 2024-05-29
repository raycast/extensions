import { Action, ActionPanel, Icon, Image, Keyboard } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { EstimatedCall, Feature, QuayLineFavorites } from "../types";
import { getDomainName } from "../utils";
import { addFavoriteLines, removeFavoriteLine } from "../storage";

type ActionsProps = {
  ec: EstimatedCall;
  venue: Feature;
  isFavorite: boolean;
  setShowDetails: () => void;
  loadMore: () => void;
  setFavorites: (favorites: QuayLineFavorites[]) => void;
};

export function Actions({
  ec,
  venue,
  isFavorite,
  setShowDetails,
  loadMore,
  setFavorites,
}: ActionsProps) {
  const urlString = ec.serviceJourney.line.authority?.url;
  const url = urlString ? new URL(urlString) : null;

  return (
    <ActionPanel>
      <Action title="Toggle Details" icon={Icon.AppWindowSidebarLeft} onAction={setShowDetails} />
      <Action
        title="Load More Departures"
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd"], key: "+" }}
        onAction={loadMore}
      />
      {isFavorite ? (
        <Action
          // eslint-disable-next-line @raycast/prefer-title-case
          title={`Remove ${formatLineName(ec)} from Favorites`}
          icon={Icon.StarDisabled}
          shortcut={Keyboard.Shortcut.Common.Pin}
          onAction={() =>
            removeFavoriteLine(ec.serviceJourney.line.id, ec.quay.id).then((f) => setFavorites(f))
          }
        />
      ) : (
        <Action
          // eslint-disable-next-line @raycast/prefer-title-case
          title={`Add ${formatLineName(ec)} to Favorites`}
          icon={Icon.Star}
          shortcut={Keyboard.Shortcut.Common.Pin}
          onAction={() =>
            addFavoriteLines(ec.serviceJourney.line.id, ec.quay.id, venue.properties.id).then((f) =>
              setFavorites(f),
            )
          }
        />
      )}
      {venue.properties.id && (
        <Action.OpenInBrowser
          url={getTravelPlannerUrl(ec)}
          title="Open Trip in Reis Travel Search"
          icon={getFavicon("https://reisnordland.no", { mask: Image.Mask.RoundedRectangle })}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
      )}
      {url && (
        <Action.OpenInBrowser
          url={url.href}
          // eslint-disable-next-line @raycast/prefer-title-case
          title={`Open ${getDomainName(url.href)}`}
          icon={getFavicon(url.origin, {
            mask: Image.Mask.RoundedRectangle,
          })}
        />
      )}
    </ActionPanel>
  );
}

function formatLineName(ec: EstimatedCall) {
  if (ec.serviceJourney.line.publicCode) {
    return `Line ${ec.serviceJourney.line.publicCode}`;
  } else {
    return ec.serviceJourney.line.description ?? ec.destinationDisplay?.frontText;
  }
}
function getTravelPlannerUrl(ec: EstimatedCall) {
  const base = "https://reise.reisnordland.no/departures/details";
  const date = new Date(ec.date);
  const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

  return `${base}/${ec.serviceJourney.id}?date=${dateString}&fromQuayId=${ec.quay.id}`;
}
