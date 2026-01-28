import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { ErrorText } from "../bamboo/exception";

export interface ResultItem extends List.Item.Props {
  url: string;
}

type SearchFunction = (query: string) => Promise<ResultItem[]>;

export const SearchCommand = (search: SearchFunction, searchBarPlaceholder?: string) => {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorText>();

  useEffect(() => {
    setError(undefined);
    setIsLoading(true);

    search(query)
      .then((resultItems) => {
        setItems(resultItems);
        setIsLoading(false);
      })
      .catch((e) => {
        setItems([]);

        if (e instanceof Error) {
          setError(ErrorText(e.name, e.message));
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [query]);

  if (error) {
    showToast(Toast.Style.Failure, error.name, error.message);
  }

  const onSearchChange = (newSearch: string) => setQuery(newSearch);
  const buildItem = (item: ResultItem) => (
    <List.Item
      key={item.id}
      title={item.title}
      subtitle={item.subtitle}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Browser actions">
            <Action.OpenInBrowser title="Open Repository in Browser" url={item.url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={onSearchChange}
      searchBarPlaceholder={searchBarPlaceholder}
      throttle
    >
      {items.map(buildItem)}
    </List>
  );
};
