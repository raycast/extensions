import { useState } from "react";

import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";

import { Details } from "@/components/Details";
import { useSearch } from "@/hooks/use-search";

const locales = [
  {
    value: "en-US",
    title: "English (US)",
  },
  {
    value: "es",
    title: "Español",
  },
  {
    value: "fr",
    title: "Français",
  },
  {
    value: "ja",
    title: "日本語",
  },
  {
    value: "ko",
    title: "한국어",
  },
  {
    value: "pt-BR",
    title: "Português (do Brasil)",
  },
  {
    value: "ru",
    title: "Русский",
  },
  {
    value: "zh-CN",
    title: "中文 (简体)",
  },
  {
    value: "zh-TW",
    title: "正體中文 (繁體)",
  },
];

export default function MDNSearchResultsList() {
  const [query, setQuery] = useState<string>("");
  const [locale, setLocale] = useState<string>("en-us");
  const { data, isLoading } = useSearch(query, locale);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Type to search MDN..."
      onSearchTextChange={setQuery}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Select Locale" storeValue={true} onChange={setLocale}>
          {locales.map((loc) => (
            <List.Dropdown.Item key={loc.value} title={loc.title} value={loc.value} keywords={[loc.title, loc.value]} />
          ))}
        </List.Dropdown>
      }
    >
      {(data || []).map((result, idx) => (
        <List.Item
          key={idx}
          title={result.title}
          icon={{ source: "icon.png", mask: Image.Mask.RoundedRectangle }}
          subtitle={result.summary}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Document}
                title="Read Document"
                target={<Details result={result} locale={locale} />}
              />
              <Action.OpenInBrowser url={result.url} />
              <Action.CopyToClipboard content={result.url} shortcut={{ modifiers: ["cmd"], key: "." }} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
