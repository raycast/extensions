import { Action, ActionPanel, List } from "@raycast/api";
import { useState } from "react";
import LangSelector, { DEFAULT_LANG, LangItem } from "./lang-selector";
import { useTranslate } from "./translate-api";

export default function Translate() {
  const [searchText, setSearchText] = useState("");
  const [lang, setLang] = useState<LangItem>(DEFAULT_LANG);
  const { data = [], isLoading, total, hasResults } = useTranslate(searchText, lang.source, lang.target);

  return (
    <List
      throttle
      isLoading={isLoading}
      searchText={searchText}
      navigationTitle="Translate"
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for a translation..."
      searchBarAccessory={<LangSelector value={lang} onChange={setLang} />}
    >
      {data.map((item) => (
        <List.Item
          key={item.key}
          subtitle={item.q}
          title={item.translated}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Tureng" url={`https://tureng.com/${item.path}`} />
            </ActionPanel>
          }
          accessories={[
            {
              tag: item.category,
            },
          ]}
        />
      ))}

      <List.Item
        title={hasResults ? `Viw more results (${total})` : "Go to Tureng.com"}
        subtitle="Go to Tureng.com"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open in Tureng"
              url={hasResults ? `https://tureng.com/${data[0].path}` : "https://tureng.com"}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
