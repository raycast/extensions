import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { Quote, QuoteMode } from "./types";
import { BASE_URL, getAuthorLink, getQuoteLink } from "./utils";

export default function Command() {
  const [mode, setMode] = useState(QuoteMode.RANDOM);
  const { isLoading, data, revalidate } = useFetch<Quote>(`${BASE_URL}/api/quotes/${mode}`);

  const getQuoteMarkdown = (quote?: Quote) => {
    if (isLoading) {
      return `
# Loading...
`;
    } else {
      return quote
        ? `
# ${quote.author.name}
_${quote.text}_
[Read more](${getAuthorLink(quote)})`
        : "";
    }
  };

  const getRandomQuote = () => {
    setMode(QuoteMode.RANDOM);
    revalidate();
  };

  const getQuoteOfTheDay = () => {
    setMode(QuoteMode.QUOTE_OF_THE_DAY);
    revalidate();
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={getQuoteMarkdown(data!)}
      actions={
        <ActionPanel>
          <Action title="I Feel Lucky" icon={Icon.Repeat} onAction={getRandomQuote} />
          <Action title="Daily Quote" icon={Icon.Calendar} onAction={getQuoteOfTheDay} />
          <Action.OpenInBrowser url={getQuoteLink(data)} />
          <Action.CopyToClipboard title="Copy Quote Link" content={getQuoteLink(data)} />
          <Action.CopyToClipboard title="Copy Author Link" content={getAuthorLink(data)} />
        </ActionPanel>
      }
    />
  );
}
