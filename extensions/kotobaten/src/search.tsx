import { List, useNavigation } from "@raycast/api";
import { useState } from "react";
import useRedirectIfUnauthenticated from "./hooks/useRedirectIfLoggedOut";
import { search } from "./services/api";
import { getToken } from "./services/authentication";
import Authenticate from "./authenticate";

const EMPTY_RESULTS = { term: "", cards: [] };

export default function Search() {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<Awaited<ReturnType<typeof search>>>(EMPTY_RESULTS);

  useRedirectIfUnauthenticated();

  const onSearchTextChange = async (newSearchText: string) => {
    setSearchText(newSearchText);

    if (searchText.length < 1) {
      setResults(EMPTY_RESULTS);
      return;
    }

    setIsLoading(true);

    const token = (await getToken())?.valueOf();
    if (typeof token !== "string") {
      navigation.push(<Authenticate />);
      return;
    }

    try {
      const result = await search(newSearchText, token);
      setResults(result);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Search your words"
      searchBarPlaceholder="Enter kanji, kana, or the meaning you're looking for ..."
      searchText={searchText}
      onSearchTextChange={onSearchTextChange}
      isShowingDetail={results.cards.length > 0}
    >
      {results.cards.length > 0 ? (
        results.cards.map((result) => (
          <List.Item
            key={result.id}
            title={result.kanji || result.kana}
            subtitle={result.sense}
            detail={
              <List.Item.Detail
                markdown={`${result.kanji ? `# ${result.kanji}` : null}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Sense" text={result.sense} />
                    {result.kanji && <List.Item.Detail.Metadata.Label title="Kanji" text={result.kanji} />}
                    {result.kana && <List.Item.Detail.Metadata.Label title="Kana" text={result.kana} />}
                    {result.note && <List.Item.Detail.Metadata.Label title="Note" text={result.note} />}
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))
      ) : (
        <List.EmptyView title="空" />
      )}
    </List>
  );
}
