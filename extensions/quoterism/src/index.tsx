import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import ImFillingLycky from "./i-m-feeling-lucky";
import QuoteOfTheDay from "./quote-of-the-day";

export default function Command() {
  const { push } = useNavigation();

  return (
    <List>
      <List.Item
        title="Quote Of The Day"
        subtitle="Get the quote of the day"
        icon={Icon.Calendar}
        actions={
          <ActionPanel>
            <Action title="Get Quote" onAction={() => push(<QuoteOfTheDay />)} />
          </ActionPanel>
        }
      />

      <List.Item
        title="I'm Feeling Lucky"
        subtitle="Get a random quote"
        icon={Icon.Emoji}
        actions={
          <ActionPanel>
            <Action title="Get Quote" onAction={() => push(<ImFillingLycky />)} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Read More Quotes"
        icon={Icon.Link}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url="https://www.quoterism.com/" />
          </ActionPanel>
        }
      />
    </List>
  );
}
