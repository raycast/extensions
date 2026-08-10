import { List, ActionPanel, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { apiUrl } from "../utils/constants";
import { Card, CardDataResponse, Earning, Feature } from "../utils/interfaces";
import { getNumbersOnly, getEarningIcon } from "../utils/helpers";

import CreditCardActions from "./creditCardActions";

export default function CardDetails(props: { cardSlug: string; cardName: string }) {
  const { cardSlug, cardName } = props;

  const url = `${apiUrl}/cards/${cardSlug}`;

  const { isLoading, data } = useFetch(url);

  const typedData = data as CardDataResponse;
  const cards = (typedData?.cards ?? []) as Card[];

  let card: Card | null = null;

  if (cards.length) {
    card = cards[0];
  }

  const cardEarnings = (card?.earnings ?? []) as Earning[];
  const cardFeatures = (card?.features ?? []) as Feature[];
  const cardCurrency = card?.currency ?? "";

  return (
    <List isLoading={isLoading} navigationTitle={`Card Details: ${cardName}`}>
      {card && (
        <>
          <List.Item
            title={card.title}
            key="Title"
            // subtitle={card.bankName}
            accessories={[
              card.bonus && card.bonus.length > 1 ? { text: { value: `Bonus: ${card.bonus}` } } : {},
              card.bonus && card.bonus.length > 1 ? { text: { value: `Months: ${card.months}` } } : {},
              card.bonus && card.bonus.length > 1 ? { text: { value: `Spend: $${card.spend}` } } : {},
              { tag: { value: "Apply Now", color: "#BF45F5" } },
            ]}
            actions={<CreditCardActions card={card} />}
          />

          {card.applicationNotes && (
            <List.Item
              title={card.applicationNotes}
              key="Application Notes"
              actions={<CreditCardActions card={card} />}
            />
          )}

          {/* {card.bonus && card.bonus.length > 1 &&
          <List.Section title="Sign Up Offer">
            <List.Item
            title="Welcome Bonus"
            subtitle={card.bonus}
            keywords={['Sign Up Offer', 'Signup Offer', 'Welcome Offer', 'Bonus']}
            / >

          <List.Item
            title="Months"
            subtitle={card.months.toString()}
            keywords={['Sign Up Offer', 'Signup Offer', 'Welcome Offer', 'Bonus']}
            / >

  <List.Item
            title="Required Spend"
            subtitle={`$${card.spend}`}
            keywords={['Sign Up Offer', 'Signup Offer', 'Welcome Offer', 'Bonus']}
            / >
          </List.Section>
        } */}

          <List.Section title="Earnings">
            {cardEarnings.map((earning) => (
              <List.Item
                title={earning.name}
                key={earning.category_name}
                icon={getEarningIcon(earning.icon)}
                keywords={[earning.category_name, "Earnings"]}
                actions={
                  <ActionPanel title="Credit Card Earning">
                    <Action.CopyToClipboard title="Copy Earning" content={earning.name} />

                    <Action.CopyToClipboard
                      title="Copy All Earnings"
                      content={cardEarnings.reduce((str, thisEarning) => `${str}${thisEarning.name}\n`, "")}
                    />
                  </ActionPanel>
                }
                accessories={[
                  // { tag: { value: earning.category_name }},
                  { tag: { value: `${earning.points}${cardCurrency === "Cash" ? "%" : "×"}` } },
                ]}
              />
            ))}
          </List.Section>

          <List.Section title="Features">
            {cardFeatures.map((feature) => (
              <List.Item
                title={feature.name}
                key={feature.name}
                keywords={["Features"]}
                actions={
                  <ActionPanel title="Credit Card Feature">
                    <Action.CopyToClipboard title="Copy Feature" content={feature.name} />

                    <Action.CopyToClipboard
                      title="Copy All Features"
                      content={cardFeatures.reduce((str, thisFeature) => `${str}${thisFeature.name}\n`, "")}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>

          <List.Section title="Details">
            <List.Item title="Annual Fee" subtitle={`$${card.fee}`} key="Annual Fee" keywords={["Details"]} />

            <List.Item
              title="Foreign Transaction Fees"
              subtitle={card.foreignFees ? "Yes" : "No"}
              key="Foreign Transaction Fees"
              keywords={["FX", "International", "Details"]}
            />

            {cardCurrency && cardCurrency.length && (
              <List.Item title="Rewards" subtitle={cardCurrency} key="Rewards" keywords={["Details"]} />
            )}

            <List.Item title="Issuer" subtitle={card.bankName} key="Issuer" keywords={["Details"]} />

            <List.Item title="Network" subtitle={card.network} key="Network" keywords={["Details"]} />

            {card.phone && (
              <List.Item
                title="Customer Support"
                subtitle={card.phone}
                key="Customer Support"
                keywords={["Details"]}
                actions={
                  <ActionPanel title="Customer Support">
                    <Action.CopyToClipboard title="Copy Phone Number" content={card.phone} />

                    <Action.OpenInBrowser title="Call" url={`tel://${getNumbersOnly(card.phone)}`} />
                  </ActionPanel>
                }
              />
            )}

            {card.reconsideration && (
              <List.Item
                title="Reconsideration"
                subtitle={card.reconsideration}
                key="Reconsideration"
                keywords={["Details"]}
                actions={
                  <ActionPanel title="Reconsideration">
                    <Action.CopyToClipboard title="Copy Phone Number" content={card.reconsideration} />

                    <Action.OpenInBrowser title="Call" url={`tel://${getNumbersOnly(card.reconsideration)}`} />
                  </ActionPanel>
                }
              />
            )}
          </List.Section>
        </>
      )}
    </List>
  );
}
