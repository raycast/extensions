import { Action, ActionPanel, Grid, List } from "@raycast/api";
import { useState } from "react";

import { PageItem } from "./components/page-item";
import useFindPagesByTitle from "./hooks/useFindPagesByTitle";
import { languages, Locale, useLanguage } from "./utils/language";
import { prefersListView } from "./utils/preferences";
import { useRecentArticles } from "./utils/recents";

const View = prefersListView ? List : Grid;

export default function SearchPage(props: { arguments: { title: string } }) {
  const [language, setLanguage] = useLanguage();
  const [search, setSearch] = useState(props.arguments.title);
  const { readArticles } = useRecentArticles();

  const { data, isLoading } = useFindPagesByTitle(search, language);

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
            {data?.results.map((res) => (
              <PageItem key={res.pageid} search={search} title={res.title} language={language} />
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
