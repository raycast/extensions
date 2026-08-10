import { List, ActionPanel, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { apiUrl } from "../utils/constants";
import { Offer, OfferDataResponse } from "../utils/interfaces";
import { toCurrency } from "../utils/helpers";

import OfferActions from "./offerActions";

import CardDetails from "./cardDetails";

export default function OfferDetails(props: { offerSlug: string; offerName: string }) {
  const { offerSlug, offerName } = props;

  const url = `${apiUrl}/offers/${offerSlug}`;

  const { isLoading, data } = useFetch(url);

  const typedData = data as OfferDataResponse;
  const offers = (typedData?.offers ?? []) as Offer[];

  let offer = null;

  if (offers.length) {
    offer = offers[0];
  }

  return (
    <List isLoading={isLoading} navigationTitle={`Offer Details: ${offerName}`}>
      {offer && (
        <>
          <List.Item
            title={offer.title}
            key="Title"
            actions={
              <OfferActions
                offer={offer}
                showViewDetails={false}
                showCopyTextTitle="Copy Title"
                copyTextValue={offer.title}
              />
            }
          />

          <List.Item
            title={offer.subtitle}
            key="Subtitle"
            actions={
              <OfferActions
                offer={offer}
                showViewDetails={false}
                showCopyTextTitle="Copy Subtitle"
                copyTextValue={offer.subtitle}
              />
            }
          />

          <List.Section title="Details">
            <List.Item title="Optimal Spend" subtitle={`${toCurrency(offer.total_available)}`} key="Optimal Spend" />

            <List.Item title="Value" subtitle={`${toCurrency(offer.value)}`} key="Value" />

            <List.Item
              title="Minimum Required"
              subtitle={`${offer.is_minimum_required ? "Yes" : "No"}`}
              key="Minimum Required"
            />

            <List.Item title="Deal Type" subtitle={`${offer.bank_name} Offer`} key="Deal Type" />

            {offer.end && <List.Item title="Expires" subtitle={`${offer.end.substring(0, 10)}`} key="Expires" />}

            {offer.url && (
              <List.Item
                title="Website"
                subtitle={`${offer.url}`}
                key="Website"
                actions={
                  <ActionPanel title="Merchant Website">
                    <Action.OpenInBrowser title="Open" url={offer.url} />

                    <Action.CopyToClipboard title="Copy URL" content={offer.url} />
                  </ActionPanel>
                }
              />
            )}
          </List.Section>

          {offer.terms && (
            <List.Section title="Terms">
              <List.Item
                title={offer.terms}
                key="Terms"
                actions={
                  <ActionPanel title="Offer Terms">
                    <Action.CopyToClipboard title="Copy" content={offer.terms} />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}

          {offer.related && offer.related?.length && (
            <List.Section title="Related Offers">
              {offer.related.map((relatedOffer) => (
                <List.Item
                  title={relatedOffer.title}
                  key={relatedOffer.slug}
                  keywords={["Related Offers"]}
                  actions={
                    <ActionPanel title="Related Offer">
                      <Action.Push
                        title="View Offer"
                        target={<OfferDetails offerSlug={relatedOffer.slug} offerName={relatedOffer.title} />}
                      />
                      <Action.OpenInBrowser
                        title="Open in CardPointers"
                        url={`cardpointers://open/offer/${relatedOffer.slug}`}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                      <Action.OpenInBrowser
                        title="Open in Browser"
                        url={`https://cardpointers.com/offers/${relatedOffer.slug}/?b=1`}
                        shortcut={{ modifiers: ["cmd"], key: "b" }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}

          {offer.cards && offer.cards?.length && (
            <List.Section title="Top Cards Found with Offer">
              {offer.cards.map((card) => (
                <List.Item
                  title={card.name}
                  key={card.slug}
                  keywords={["Top Cards", "Cards"]}
                  actions={
                    <ActionPanel title="Related Card">
                      <Action.Push
                        title="View Card"
                        target={<CardDetails cardSlug={card.slug} cardName={card.name} />}
                      />
                      <Action.OpenInBrowser
                        title="Open in CardPointers"
                        url={`cardpointers://open/cards/${card.slug}`}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                      <Action.OpenInBrowser
                        title="Open in Browser"
                        url={`https://cardpointers.com/cards/${card.slug}/?b=1`}
                        shortcut={{ modifiers: ["cmd"], key: "b" }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
