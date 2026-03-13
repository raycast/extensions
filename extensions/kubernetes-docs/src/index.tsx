import { Action, ActionPanel, List, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { DocFile, DocsItem, DocsResponse, Language, Preferences } from "./types";
import useFetcher from "./hooks/useFetcher";

const ICON = "command-icon.png";

const Languages: Record<Language, DocFile[]> = {
  en: require("./docs/en.json"),
  de: require("./docs/de.json"),
  es: require("./docs/es.json"),
  fr: require("./docs/fr.json"),
  id: require("./docs/id.json"),
  it: require("./docs/it.json"),
  ja: require("./docs/ja.json"),
  ko: require("./docs/ko.json"),
  pl: require("./docs/pl.json"),
  pt: require("./docs/pt.json"),
  ru: require("./docs/ru.json"),
  uk: require("./docs/uk.json"),
  zh: require("./docs/zh.json"),
};

export default function main() {
  const { language } = getPreferenceValues<Preferences>();
  const { loading, fetcher } = useFetcher();
  const [items, setItems] = useState<DocsItem[]>([]);

  const onQueryChange = async (query: string) => {
    if (!query) {
      setItems([]);
      return;
    }

    const {
      data: { webPages },
    } = await fetcher<DocsResponse>({ query });

    if (!webPages || !webPages.value) return;

    const items = webPages.value.filter(({ language: lang }) => lang === language);

    setItems(items);
  };

  return (
    <List isLoading={loading} onSearchTextChange={onQueryChange} throttle>
      {items.length
        ? items.map((item) => (
            <List.Item
              key={item.id}
              title={item.name}
              subtitle={item.snippet}
              icon={ICON}
              actions={
                <ActionPanel title={item.url}>
                  <Action.OpenInBrowser url={item.url} />
                  <Action.CopyToClipboard title="Copy URL" content={item.url} />
                </ActionPanel>
              }
            />
          ))
        : Languages[language].map(({ title, link }, index) => (
            <List.Item
              key={index}
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
