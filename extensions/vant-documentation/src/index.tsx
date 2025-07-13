import { useState } from "react";
import { List, ActionPanel, Action, Icon, getPreferenceValues } from "@raycast/api";
import { useSearch } from "@/hooks/use-search";
import { LanguageDropdown } from "@/components/language-dropdown";
import { DocumentationDetails } from "@/components/documentation-details";
import { EN_US, LANGUAGES, getSupportStateText, getSupportStateColor, getCompDocUrl } from "@/utils";

import type { Doc, DocItem } from "@/type";

const returnItemAccessory = (language: string, item: DocItem, isEmptyQuery: boolean) => {
  if (isEmptyQuery) return [];

  const accessories = [
    {
      tag: { value: item.version.toLocaleUpperCase() },
      icon: Icon.Book,
    },
    {
      tag: { value: getSupportStateText(language, item.version), color: getSupportStateColor(item.version) },
    },
  ];

  return accessories;
};

export default function Command() {
  const [language, setLanguage] = useState<string>(EN_US);

  const [query, setQuery] = useState<string>("");

  const { docs, isEmptyQuery } = useSearch(language, query);

  const { preferredAction } = getPreferenceValues<Preferences.Index>();

  const ListItem = (isEmptyQuery: boolean, item: DocItem) => {
    return (
      <List.Item
        key={`${item.version}-${item.component}`}
        icon="vant-icon.png"
        title={item.title}
        subtitle={item.describe}
        accessories={returnItemAccessory(language, item, isEmptyQuery)}
        actions={
          <ActionPanel>
            {[
              <Action.Push
                key="read"
                title="Read Documentation"
                target={<DocumentationDetails language={language} docItem={item} />}
              />,
              <Action.OpenInBrowser key="open" url={getCompDocUrl(language, item)} />,
              <Action.CopyToClipboard
                key="copy"
                content={getCompDocUrl(language, item)}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />,
            ].sort((a) => (a.key === preferredAction ? -1 : 1))}
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      searchBarPlaceholder="Search for a component"
      onSearchTextChange={setQuery}
      throttle
      searchBarAccessory={<LanguageDropdown languages={LANGUAGES} onLanguageChange={setLanguage} />}
    >
      {isEmptyQuery
        ? (docs as Doc[]).map((group, key) => (
            <List.Section key={key} title={group.title}>
              {group.items.map((item) => ListItem(isEmptyQuery, item))}
            </List.Section>
          ))
        : (docs as DocItem[]).map((item) => ListItem(isEmptyQuery, item))}
    </List>
  );
}
