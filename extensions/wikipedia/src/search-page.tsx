import { Action, ActionPanel, Icon, List, getPreferenceValues } from "@raycast/api";
import { useCachedPromise, useCachedState, usePromise } from "@raycast/utils";
import { useState } from "react";
import ShowDetailsPage from "./show-details-page";
import { findPagesByTitle, getPageData } from "./utils/api";
import { languages } from "./utils/constants";

const preferences = getPreferenceValues();

export default function SearchPage(props: { arguments: { title: string } }) {
  const [language, setLanguage] = useCachedState("language", "en");
  const [search, setSearch] = useState(props.arguments.title);
  const { data, isLoading } = usePromise(findPagesByTitle, [search, language]);

  return (
    <List
      throttle
      isLoading={isLoading}
      searchText={search}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search pages by name..."
      searchBarAccessory={
        <List.Dropdown tooltip="Language" value={language} onChange={setLanguage}>
          {languages.map((language) => (
            <List.Dropdown.Item
              key={language.value}
              icon={language.icon}
              title={language.title}
              value={language.value}
            />
          ))}
        </List.Dropdown>
      }
    >
      {data?.language === language &&
        data?.results.map((title: string) => <PageItem key={title} title={title} language={language} />)}
    </List>
  );
}

function PageItem({ title, language }: { title: string; language: string }) {
  const { data: page } = useCachedPromise(getPageData, [title, language]);

  return (
    <List.Item
      icon={{ source: page?.thumbnail?.source || "../assets/wikipedia.png" }}
      id={title}
      title={title}
      subtitle={page?.description}
      actions={
        <ActionPanel>
          {preferences.defaultAction === "browser" ? (
            <>
              <Action.OpenInBrowser url={page?.content_urls.desktop.page || ""} />
              <Action.Push icon={Icon.Window} title="Show Details" target={<ShowDetailsPage title={title} />} />
            </>
          ) : (
            <>
              <Action.Push icon={Icon.Window} title="Show Details" target={<ShowDetailsPage title={title} />} />
              <Action.OpenInBrowser url={page?.content_urls.desktop.page || ""} />
            </>
          )}
          <ActionPanel.Section>
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd"], key: "." }}
              title="Copy URL"
              content={page?.content_urls.desktop.page || ""}
            />
            <Action.CopyToClipboard shortcut={{ modifiers: ["cmd"], key: "," }} title="Copy Title" content={title} />
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              title="Copy Description"
              content={page?.description}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
