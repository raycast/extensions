import { Action, ActionPanel, Icon, List, getPreferenceValues, Grid } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import WikipediaPage from "./components/wikipedia-page";
import { findPagesByTitle, getPageData } from "./utils/api";
import { languages } from "./utils/constants";
import { toSentenceCase } from "./utils/string";
import AskQuestionPage from "./components/ask-question-page";
import { useLanguage } from "./utils/hooks";

const preferences = getPreferenceValues();

const View = preferences.viewType === "list" ? List : Grid;
const openInBrowser = preferences.openIn === "browser";

export default function SearchPage(props: { arguments: { title: string } }) {
  const [language, setLanguage] = useLanguage();
  const [search, setSearch] = useState(props.arguments.title);
  const { data, isLoading } = useCachedPromise(findPagesByTitle, [search, language]);

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
      searchBarAccessory={
        <View.Dropdown tooltip="Language" value={language} onChange={setLanguage}>
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
      {data?.language === language &&
        data?.results.map((title: string) => <PageItem key={title} title={title} language={language} />)}
    </View>
  );
}

function PageItem({ title, language }: { title: string; language: string }) {
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
          <Action.Push
            title="Ask Question"
            icon={Icon.QuestionMarkCircle}
            target={<AskQuestionPage title={title} />}
            shortcut={{ modifiers: ["cmd"], key: "j" }}
          />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd"], key: "." }}
              title="Copy URL"
              content={page?.content_urls.desktop.page || ""}
            />
            <Action.CopyToClipboard shortcut={{ modifiers: ["cmd"], key: "," }} title="Copy Title" content={title} />
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              title="Copy Subtitle"
              content={page?.description}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
