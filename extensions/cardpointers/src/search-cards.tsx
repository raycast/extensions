import { Grid, ActionPanel, Action, Icon, LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { apiUrl } from "./utils/constants";
import { Card, CardNameQuery, CardDataResponse } from "./utils/interfaces";

import CardDetails from "./components/cardDetails";

export default function SearchCards(props: LaunchProps<{ arguments: CardNameQuery }>) {
  const { cardName } = props.arguments;

  const url = `${apiUrl}/search/cards/${cardName}`;

  const { isLoading, data } = useFetch(url);

  /*
  Data is in this format:

  {
    success: true,
    results: [
      {
        title: 'Chase Sapphire Reserve',
        slug: 'chase-sapphire-reserve',
        type: 'card',
        subtitle: "This card is awesome.",
        expired: false
      }
    ]
  }
  */

  const typedData = data as CardDataResponse;
  const results = (typedData?.results ?? []) as Card[];

  return (
    <Grid columns={3} isLoading={isLoading} searchBarPlaceholder={"Card Name"} aspectRatio="4/3">
      <Grid.Section title="Matching Cards" subtitle={cardName}>
        {results?.map((card) => (
          <Grid.Item
            key={card.slug}
            id={`${card.slug}`}
            title={card.title}
            content={{
              source: `https://images.cardpointers.com/images/cards/${card.slug}.png`,
            }}
            keywords={[card.nickname ?? ""]}
            actions={
              <ActionPanel title="Credit Card Details">
                <Action.Push
                  title="View Details"
                  icon={Icon.CreditCard}
                  target={<CardDetails cardSlug={card.slug} cardName={card.title} />}
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

                <ActionPanel.Section />

                <Action.CopyToClipboard
                  title="Copy Link"
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                  content={`https://cardpointers.com/cards/${card.slug}/`}
                />
                <Action.CopyToClipboard
                  title="Copy Card Title"
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                  content={card.title}
                />
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}
