import { Action, ActionPanel, Detail } from '@raycast/api';
import { useFetch } from '@raycast/utils';

type StoicQuote = {
  id: number;
  author_id: number;
  body: string;
  author: string;
};

const endpoint = 'https://stoicquotesapi.com/v1/api/quotes/random';

export default function Command() {
  const { isLoading, data, revalidate } = useFetch<StoicQuote>(endpoint, {
    keepPreviousData: false,
    headers: {
      Accept: 'application/json',
    },
  });

  const markdownQuote = data ? `> ${data.body}\n\n_${data.author}_` : '';
  const plainTextQuote = data ? `${data.body} - ${data.author}` : '';

  const stoicQuote = !isLoading && data ? markdownQuote : 'Loading...';

  return (
    <Detail
      isLoading={isLoading}
      markdown={stoicQuote}
      actions={
        <ActionPanel>
          <Action title="New Quote" onAction={revalidate} />
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
