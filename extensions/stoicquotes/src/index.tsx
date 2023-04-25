import { Action, ActionPanel, Detail, Icon } from '@raycast/api';
import { useFetch } from '@raycast/utils';

type StoicQuote = {
  text: string;
  author: string;
};

const endpoint = 'https://stoic-quotes.com/api/quote';

export default function Command() {
  const { isLoading, data, revalidate } = useFetch<StoicQuote>(endpoint, {
    keepPreviousData: false,
    headers: {
      Accept: 'application/json',
    },
  });

  const markdownQuote = data ? `> ${data.text}\n\n_${data.author}_` : '';
  const plainTextQuote = data ? `${data.text} - ${data.author}` : '';

  const stoicQuote = !isLoading && data ? markdownQuote : 'Loading...';

  return (
    <Detail
      isLoading={isLoading}
      markdown={stoicQuote}
      actions={
        <ActionPanel>
          <Action title="New Quote" icon={Icon.ArrowClockwise} onAction={revalidate} />
          <Action.CopyToClipboard
            title="Copy as Markdown"
            content={markdownQuote}
            shortcut={{
              modifiers: ['cmd'],
              key: 'c',
            }}
          />
          <Action.CopyToClipboard
            title="Copy as Plain Text"
            content={plainTextQuote}
            shortcut={{
              modifiers: ['cmd', 'shift'],
              key: 'c',
            }}
          />
        </ActionPanel>
      }
    />
  );
}
