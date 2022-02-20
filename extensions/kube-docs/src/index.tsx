import { Action, ActionPanel, List } from '@raycast/api'
import { useCallback, useState } from 'react';
import { debounce } from 'throttle-debounce';
import { DocsItem, DocsResponse } from './types'
import useFetcher from './hooks/useFetcher'

const DEBOUNCE_DELAY = 300;

export default function main() {
  const { loading, fetcher } = useFetcher();
  const [items, setItems] = useState<DocsItem[]>([]);

  const onQueryChange = async (query: string) => {
    if (!query) {
      setItems([]);
      return;
    }

    const { data: { webPages } } = await fetcher<DocsResponse>({ query });

    if (!webPages || !webPages.value) return;

    setItems(webPages.value);
  }

  const debounceCallback = useCallback(debounce(DEBOUNCE_DELAY, onQueryChange), []);

  return (
    <List
      isLoading={loading}
      onSearchTextChange={debounceCallback}
    >
      {items.map(item => (
        <List.Item
          key={item.id}
          title={item.name}
          subtitle={item.snippet}
          actions={
            <ActionPanel title={item.url}>
              <Action.OpenInBrowser url={item.url} />
              <Action.CopyToClipboard title='Copy URL' content={item.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}