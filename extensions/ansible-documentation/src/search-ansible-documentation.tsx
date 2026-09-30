import { Action, ActionPanel, List } from "@raycast/api";
import { useState } from "react";
import { DocFile, DocsItem, DocsResponse, Language } from "./types";
import useFetcher from "./hooks/useFetcher";

const ICON = "command-icon.png";

const Languages: Record<Language, DocFile[]> = {
  en: require("./docs/en.json"),
};

export default function main() {
  const [items, setItems] = useState<DocsItem[]>([]);
  const { loading, fetcher } = useFetcher();

  const onQueryChange = async (query: string) => {
    if (!query) {
      setItems([]);
      return;
    }
    const {
      data: { webPages },
    } = await fetcher<DocsResponse>({ query });

    if (!webPages || !webPages.value) return;

    const items = webPages.value;

    setItems(items);
  };

  return (
    <List isLoading={loading} onSearchTextChange={onQueryChange} throttle>
      {items.length
        ? items.map((item) => (
            <List.Item
              key={item.id}
              title={item.name}
              icon={ICON}
              actions={
                <ActionPanel title={item.url}>
                  <Action.OpenInBrowser url={item.url} />
                  <Action.CopyToClipboard title="Copy URL" content={item.url} />
                </ActionPanel>
              }
            />
          ))
        : Languages["en"].map(({ title, link }) => (
            <List.Item
              key={title}
              title={title}
              icon={ICON}
              actions={
                <ActionPanel title={link}>
                  <Action.OpenInBrowser url={link} />
                  <Action.CopyToClipboard title="Copy URL" content={link} />
                </ActionPanel>
              }
            />
          ))}
    </List>
  );
}
