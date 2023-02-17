import { Action, ActionPanel, Icon, List, getPreferenceValues } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { useState } from "react";
import ShowDetailsPage from "./show-details-page";
import { findPagesByTitle, getPageData } from "./wikipedia";

const preferences = getPreferenceValues();

export default function SearchPage() {
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("en");
  const { data, isLoading } = usePromise(findPagesByTitle, [search, language]);

  return (
    <List
      throttle
      isLoading={isLoading}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search pages by name..."
      searchBarAccessory={
        <List.Dropdown tooltip="Language" storeValue onChange={setLanguage}>
          <List.Dropdown.Item icon="🇺🇸" title="English" value="en" />
          <List.Dropdown.Item icon="🇩🇪" title="German" value="de" />
          <List.Dropdown.Item icon="🇫🇷" title="French" value="fr" />
          <List.Dropdown.Item icon="🇯🇵" title="Japanese" value="ja" />
          <List.Dropdown.Item icon="🇪🇸" title="Spanish" value="es" />
          <List.Dropdown.Item icon="🇷🇺" title="Russian" value="ru" />
          <List.Dropdown.Item icon="🇵🇹" title="Portuguese" value="pt" />
          <List.Dropdown.Item icon="🇮🇹" title="Italian" value="it" />
          <List.Dropdown.Item icon="🇨🇳" title="Chinese" value="zh" />
          <List.Dropdown.Item icon="🇮🇷" title="Persian" value="fa" />
          <List.Dropdown.Item icon="🇦🇪" title="Arabic" value="ar" />
          <List.Dropdown.Item icon="🇵🇱" title="Polish" value="pl" />
          <List.Dropdown.Item icon="🇸🇽" title="Dutch" value="nl" />
          <List.Dropdown.Item icon="🇹🇷" title="Turkish" value="tr" />
          <List.Dropdown.Item icon="🇬🇷" title="Greek" value="el" />
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
              <Action.Push
                icon={Icon.Window}
                title="Show Details"
                target={<ShowDetailsPage title={title} language={language} />}
              />
            </>
          ) : (
            <>
              <Action.Push
                icon={Icon.Window}
                title="Show Details"
                target={<ShowDetailsPage title={title} language={language} />}
              />
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
