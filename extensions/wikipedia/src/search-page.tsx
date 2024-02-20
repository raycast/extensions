import { Action, ActionPanel, Icon, List, Grid } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import WikipediaPage from "./components/wikipedia-page";
import { findPagesByTitle, getPageData } from "./utils/api";
import { toSentenceCase } from "./utils/formatting";
import { languages, Locale, useLanguage } from "./utils/language";
import { openInBrowser, prefersListView } from "./utils/preferences";
import { useRecentArticles } from "./utils/recents";

const View = prefersListView ? List : Grid;

export default function SearchPage(props: { arguments: { title: string } }) {
  const [language, setLanguage] = useLanguage();
  const [search, setSearch] = useState(props.arguments.title);
  const { readArticles } = useRecentArticles();
  const { data, isLoading } = useCachedPromise(findPagesByTitle, [search, language], {
    keepPreviousData: true,
  });

  return (
    <View
      throttle
      isLoading={isLoading}
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      fit={Grid.Fit.Fill}
      searchText={search}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search pages by name..."
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Search in Browser"
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            url={`https://${language}.wikipedia.org/w/index.php?fulltext=1&profile=advanced&search=${search}&title=Special%3ASearch&ns0=1`}
          />
        </ActionPanel>
      }
      searchBarAccessory={
        <View.Dropdown tooltip="Language" value={language} onChange={(value) => setLanguage(value as Locale)}>
          {languages.map((language) => (
            <View.Dropdown.Item
              key={language.value}
              icon={language.icon}
              title={language.title}
              value={language.value}
            />
          ))}
        </View.Dropdown>
      }
    >
      {search ? (
        data?.language === language && (
          <View.Section title="Results">
            {data?.results.map((title: string) => (
              <PageItem key={title} search={search} title={title} language={language} />
            ))}
          </View.Section>
        )
      ) : (
        <View.Section title="Recent Articles">
          {readArticles.map((title) => (
            <PageItem key={title} search={search} title={title} language={language} />
          ))}
        </View.Section>
      )}
    </View>
  );
}

function PageItem({ search, title, language }: { search: string; title: string; language: string }) {
  const { data: page } = useCachedPromise(getPageData, [title, language]);

  return (
    <View.Item
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      content={{ source: page?.thumbnail?.source || Icon.Image }}
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      icon={{ source: page?.thumbnail?.source || "../assets/wikipedia.png" }}
      id={title}
      title={title}
      subtitle={page?.description ? toSentenceCase(page.description) : ""}
      actions={
        <ActionPanel>
          {openInBrowser ? (
            <>
              <Action.OpenInBrowser url={page?.content_urls.desktop.page || ""} />
              <Action.Push icon={Icon.Window} title="Show Details" target={<WikipediaPage title={title} />} />
            </>
          ) : (
            <>
              <Action.Push icon={Icon.Window} title="Show Details" target={<WikipediaPage title={title} />} />
              <Action.OpenInBrowser url={page?.content_urls.desktop.page || ""} />
            </>
          )}
          <Action.OpenInBrowser
            title="Search in Browser"
            url={`https://${language}.wikipedia.org/w/index.php?fulltext=1&profile=advanced&search=${search}&title=Special%3ASearch&ns0=1`}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd"], key: "." }}
              title="Copy URL"
              content={page?.content_urls.desktop.page || ""}
            />
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
              title="Copy Title"
              content={title}
            />
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              title="Copy Subtitle"
              content={page?.description ?? ""}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
