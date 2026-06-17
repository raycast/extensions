import { ActionPanel, Action, Icon } from "@raycast/api";
import OfferDetails from "./offerDetails";
import { Offer } from "../utils/interfaces";

export default function OfferActions({
  offer,
  showViewDetails,
  showCopyTextTitle = "",
  copyTextValue = "",
}: {
  offer: Offer;
  showViewDetails: boolean;
  showCopyTextTitle: string;
  copyTextValue: string;
}) {
  return (
    <ActionPanel title="Offer Details">
      {showViewDetails && (
        <Action.Push
          title="View Details"
          icon={Icon.LightBulb}
          target={<OfferDetails offerSlug={offer.slug} offerName={offer.title} />}
        />
      )}

      <Action.OpenInBrowser
        title="Open in CardPointers"
        url={`cardpointers://open/offer/${offer.slug}`}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
      />
      <Action.OpenInBrowser
        title="Open in Browser"
        url={`https://cardpointers.com/cards/${offer.slug}/?b=1`}
        shortcut={{ modifiers: ["cmd"], key: "b" }}
      />

      <ActionPanel.Section />

      <Action.CopyToClipboard
        title="Copy Link"
        shortcut={{ modifiers: ["cmd"], key: "l" }}
        content={`https://cardpointers.com/offers/${offer.slug}/`}
      />

      {showCopyTextTitle.length && copyTextValue.length && (
        <Action.CopyToClipboard
          title={showCopyTextTitle}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          content={copyTextValue}
        />
      )}
    </ActionPanel>
  );
}
