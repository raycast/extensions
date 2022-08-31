import { Action, ActionPanel, List, Icon } from "@raycast/api";
import { FC } from "react";
import WordList from "./components/WordList";
import { useSearch } from "./helpers/useSearch";
import { getSaurusUrl, useThasaurus } from "./helpers/thesaurus";

interface iSynonymProps {
  arguments?: { word: string };
}

const Synonym: FC<iSynonymProps> = (props) => {
  const { query, onQuery } = useSearch(props.arguments?.word);
  const { isLoading, data } = useThasaurus(query);

  return (
    <List
      enableFiltering={false}
      onSearchTextChange={onQuery}
      navigationTitle="Search word"
      searchBarPlaceholder="Search a word on Thesaurus"
      isLoading={isLoading}
      throttle
      searchText={query}
      // isShowingDetail
    >
      {!data?.synonyms?.length ? (
        <List.EmptyView title="Search for a word to get started" />
      ) : (
        <>
          <List.Item
            title={data?.pos}
            subtitle={data.definition}
            actions={[
              <ActionPanel>
                <Action.OpenInBrowser url={getSaurusUrl(data.entry)} />
              </ActionPanel>,
            ]}
          />
          <WordList title={`Synonyms`} words={data?.synonyms || []} />
          <WordList title={`Antonyms`} words={data?.antonyms || []} />

          <List.Section title={`Use ${data.entry} in sentence`}>
            {data?.exampleSentences.map((s) => (
              <List.Item
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard content={s} />
                  </ActionPanel>
                }
                key={s}
                title={s}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
};

export default Synonym;
