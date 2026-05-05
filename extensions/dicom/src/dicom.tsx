import path from "node:path";
import { useState, useCallback } from "react";
import { List, Action, ActionPanel, environment, Icon } from "@raycast/api";
import type { DictionaryItem, ValueRepresentation } from "./types";
import { valueRepresentationDescriptions, valueRepresentationNames } from "./const";
import { useStreamJSON } from "@raycast/utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const filter = useCallback(
    (item: DictionaryItem) => {
      if (!searchText) return true;
      const tagMatch = item.tag.toLowerCase().includes(searchText.toLowerCase());
      const nameMatch = item.name?.toLowerCase().includes(searchText.toLowerCase());
      return tagMatch || nameMatch;
    },
    [searchText],
  );

  const { data, isLoading, pagination } = useStreamJSON(
    `file://${path.join(environment.assetsPath, "dictionary.json")}`,
    {
      initialData: [] as DictionaryItem[],
      pageSize: 100,
      filter,
    },
  );

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Type the dicom tag or description"
      isLoading={isLoading}
      pagination={pagination}
    >
      <List.Section title={`Matching attributes`}>
        {data.map(({ tag, name, vr }) => (
          <List.Item
            key={tag}
            title={`${tag} - ${name}`}
            accessories={[
              {
                text: vr,
                icon: Icon.Tag,
                tooltip: `${vr} - ${valueRepresentationNames[vr as ValueRepresentation]} \n\n${valueRepresentationDescriptions[vr as ValueRepresentation] ?? "No description available"}`,
              },
            ]}
            // Wire up actions
            actions={
              <ActionPanel title={tag}>
                {tag && (
                  <>
                    <Action.CopyToClipboard title="Copy DICOM Tag" content={tag} />
                    <Action.OpenInBrowser
                      url={`http://dicomlookup.com/lookup.asp?sw=Tnumber&q=${tag}`}
                      title="Open in Browser"
                    />
                  </>
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
