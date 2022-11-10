import { useState } from "react";
import { Action, ActionPanel, List, showToast } from "@raycast/api";
import translate, { Languages, Translations } from "dictcc";

import { createInputFromSearchTerm, getListSubtitle, joinStringsWithDelimiter } from "./utils";

interface IListWithEmptyViewProps {
  loading: boolean;
  showNoResultsFound: boolean;
}

export const ListWithEmptyView = ({ loading, showNoResultsFound }: IListWithEmptyViewProps) => {
  if (loading) {
    return <List.EmptyView title={"Loading..."} icon={{ source: "icon-small.png" }} />;
  }

  return (
    <List.EmptyView title={!showNoResultsFound ? "Type to search" : "No Results"} icon={{ source: "icon-small.png" }} />
  );
};

export default function Command() {
  const [translations, setTranslations] = useState<Translations[] | undefined>();
  const [url, setUrl] = useState<string | undefined>();
  const [languages, setLanguages] = useState<[/* source */ Languages, /* target */ Languages] | undefined>();
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  const onSearchTextChange = async (searchTerm: string) => {
    setLoading(true);

    try {
      const input = createInputFromSearchTerm(searchTerm);
      const { data, error, url } = await translate(input);

      if (error) {
        throw error;
      }

      setTranslations(data);
      setUrl(url);
      setLanguages([input.sourceLanguage, input.targetLanguage]);
      setSearchText(searchTerm);
    } catch (error) {
      if (error instanceof Error) {
        showToast({
          title: "Error",
          message: error.message,
        });
      }
    }
    setLoading(false);
  };

  return (
    <List
      isLoading={loading}
      navigationTitle="Search dict.cc"
      onSearchTextChange={onSearchTextChange}
      searchBarPlaceholder="Search term (e.g. 'en de Home', or 'Home')"
      throttle
    >
      <ListWithEmptyView loading={loading} showNoResultsFound={!!searchText.length} />

      <List.Section title="Results" subtitle={getListSubtitle(loading, languages, translations?.length)}>
        {translations?.map((translation, index) => (
          <List.Item
            key={index}
            title={translation.targetTranslation.text}
            subtitle={translation.sourceTranslation.text}
            accessories={[
              { text: joinStringsWithDelimiter(translation.targetTranslation.meta.abbreviations) },
              { text: joinStringsWithDelimiter(translation.targetTranslation.meta.comments) },
              { text: joinStringsWithDelimiter(translation.targetTranslation.meta.wordClassDefinitions) },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Text"
                  content={translation.targetTranslation.text}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
                {url && <Action.OpenInBrowser url={url} />}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
