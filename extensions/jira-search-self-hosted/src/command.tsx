import { ActionPanel, List, showToast, Action, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { ErrorText } from "./exception";

export type ResultItem = List.Item.Props & {
  url: string;
  linkText?: string;
};
type SearchFunction = (query: string) => Promise<ResultItem[]>;

const markdownLink = (item: ResultItem) => `[${item.linkText ?? item.title}](${item.url})`;
const htmlLink = (item: ResultItem) => `<a href="${item.url}">${item.linkText ?? item.title}</a>`;

export function SearchCommand(search: SearchFunction, searchBarPlaceholder?: string) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorText>();
  useEffect(() => {
    let isCurrentQuery = true;

    setError(undefined);
    setIsLoading(true);
    search(query)
      .then((resultItems) => {
        if (!isCurrentQuery) return;
        setItems(resultItems);
      })
      .catch((e) => {
        if (!isCurrentQuery) return;
        setItems([]);
        console.warn(e);
        if (e instanceof Error) {
          setError(ErrorText(e.name, e.message));
        }
      })
      .finally(() => {
        if (isCurrentQuery) setIsLoading(false);
      });

    return () => {
      isCurrentQuery = false;
    };
  }, [query]);

  const onSearchChange = (newSearch: string) => setQuery(newSearch);
  const buildItem = (item: ResultItem) => (
    <List.Item
      key={item.id}
      {...item}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="URL">
            <Action.OpenInBrowser url={item.url} />
            <Action.CopyToClipboard content={item.url} title="Copy URL" />
          </ActionPanel.Section>
          <ActionPanel.Section title="Link">
            <Action.CopyToClipboard content={markdownLink(item)} title="Copy Markdown Link" />
            <Action.CopyToClipboard content={htmlLink(item)} title="Copy HTML Link" />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: error.name,
      message: error.message,
    });
  }

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
}
