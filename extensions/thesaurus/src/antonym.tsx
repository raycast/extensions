import { List } from "@raycast/api";
import { FC } from "react";
import WordList from "./components/WordList";
import { useSearch } from "./helpers/useSearch";
import { useThasaurus } from "./helpers/thesaurus";

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
        <WordList
          title={`Antonyms for ${data.entry} (${data.pos})`}
          subtitle={data.definition}
          words={data?.antonyms || []}
        />
      )}
    </List>
  );
};

export default Synonym;
