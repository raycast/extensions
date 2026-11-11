import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { kbbiWebsiteUrl, parseSearchResponse, searchUrl } from "./api";
import WordDetail from "./components/WordDetail";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const query = searchText.trim();

  const { data, isLoading } = useFetch(searchUrl(query), {
    parseResponse: parseSearchResponse,
    execute: query.length > 0,
    keepPreviousData: true,
    failureToastOptions: { title: "Could not search KBBI" },
  });

  const lemmas = query.length > 0 ? (data ?? []) : [];

  return (
    <List
      isLoading={query.length > 0 && isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Indonesian words, e.g. rumah"
      throttle
    >
      {query.length === 0 ? (
        <List.EmptyView
          icon={Icon.Book}
          title="Search KBBI"
          description="Type an Indonesian word to look up its definition"
        />
      ) : isLoading ? null : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Words Found"
          description={`No KBBI entries match "${query}"`}
        />
      )}
      {lemmas.map((lemma) => (
        <List.Item
          key={lemma}
          title={lemma}
          icon={Icon.Book}
          actions={
            <ActionPanel>
              <Action.Push title="Show Definition" icon={Icon.Eye} target={<WordDetail word={lemma} />} />
              <Action.CopyToClipboard title="Copy Word" content={lemma} />
              <Action.OpenInBrowser title="Open in KBBI Website" url={kbbiWebsiteUrl(lemma)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
