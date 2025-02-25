import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Quote } from "./types";
import { getQuoteLink } from "./utils";

export default function ImFillingLycky() {
  const { pop } = useNavigation();
  const { isLoading, data, revalidate } = useFetch<Quote>("https://www.quoterism.com/api/quotes/random");

  const getMarkdown = (quote?: Quote) =>
    quote
      ? `
# ${quote.author.name}
_${quote.text}_
`
      : "";

  return (
    <Detail
      isLoading={isLoading}
      markdown={getMarkdown(data!)}
      actions={
        <ActionPanel>
          <Action title="Get New Quote" icon={Icon.Repeat} onAction={revalidate} />
          <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
          <Action.OpenInBrowser url={getQuoteLink(data)} />
          <Action.CopyToClipboard title="Copy Link" content={getQuoteLink(data)} />
        </ActionPanel>
      }
    />
  );
}
