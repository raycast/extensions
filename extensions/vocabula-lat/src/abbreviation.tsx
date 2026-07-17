import { Action, ActionPanel, List } from "@raycast/api";
import { useState } from "react";
import { useFetch } from "@raycast/utils";
import { Abbreviation, AbbreviationListBase } from "./types";
import AbbreviationDetail from "./components/AbbreviationDetail";

export default function Command() {
  const [query, setQuery] = useState<string | undefined>();
  const [showingDetail, setShowingDetail] = useState(true);
  const { isLoading: isLoadingList, data } = useFetch<AbbreviationListBase, AbbreviationListBase>(
    `https://www.vocabula.lat/api/abr/ray/${query}`,
    {
      keepPreviousData: true,
      initialData: [],
      execute: query && query?.length > 0 ? true : false,
      parseResponse: async (response) => {
        const data = await response.json();
        return data;
      },
    },
  );

  return (
    <List
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Type a Latin abbreviation..."
      isShowingDetail={showingDetail}
      isLoading={isLoadingList}
      throttle={true}
    >
      {data &&
        data?.length > 0 &&
        data?.map((abbr: Abbreviation, index: number) => {
          const markdown = `# ${abbr.characters}\n\n![image](https://www.vocabula.lat/api/static/${abbr.id}.jpg)`;

          const props: Partial<List.Item.Props> = showingDetail
            ? {
                detail: (
                  <List.Item.Detail
                    markdown={markdown}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <AbbreviationDetail abbreviation={abbr} />
                      </List.Item.Detail.Metadata>
                    }
                  />
                ),
              }
            : { accessories: [{ text: abbr.transcription }, { tag: abbr.language }] };

          return (
            <List.Section key={index}>
              <List.Item
                id={`${abbr.id}-${index}`}
                title={abbr.characters}
                {...props}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={`https://www.vocabula.lat/?q=${abbr.characters}`} />
                    <Action title="Show Detail" onAction={() => setShowingDetail(!showingDetail)} />
                  </ActionPanel>
                }
              />
            </List.Section>
          );
        })}
    </List>
  );
}
