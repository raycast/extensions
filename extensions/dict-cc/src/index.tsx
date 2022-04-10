import { useState } from "react";
import { Action, ActionPanel, List, showToast } from "@raycast/api";

import { createInputFromSearchTerm, getListSubtitle, joinStringsWithDelimiter } from "./utils";
import translate, { Translations } from "dictcc";

export const ListWithEmptyView = () => <List.EmptyView title="No Results" icon={{ source: "icon-small.png" }} />;

export default function Command() {
  const [translations, setTranslations] = useState<Translations[] | undefined>();
  const [url, setUrl] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

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
      searchBarPlaceholder="Search term (e.g. 'en de Home', or 'Home')"
      throttle
      onSearchTextChange={onSearchTextChange}
    >
      <ListWithEmptyView />

      <List.Section title="Results" subtitle={getListSubtitle(loading, translations?.length || 0)}>
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
