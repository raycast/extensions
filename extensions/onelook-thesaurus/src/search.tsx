import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { useFetch } from "@raycast/utils";

type Word = {
  word: string;
  defs: string[];
};

const toQueryString = (query: string) => {
  return query.replaceAll(" ", "+");
};

const toDetailMarkdown = (word: Word) => {
  return "# " + word.word + "\n---\n" + (word.defs?.join("\n\n") || "");
};

export default function Command() {
  const [query, setQuery] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  const { isLoading, data } = useFetch<Word[]>("https://www.onelook.com/api/words?md=d&ml=" + toQueryString(query), {
    execute: !!query,
  });

  return (
    <List
      isShowingDetail={showDetails}
      isLoading={isLoading}
      throttle={true}
      onSearchTextChange={(searchText) => setQuery(searchText)}
    >
      {(data || []).map((word: Word, index: number) => (
        <List.Item
          key={index}
          title={word.word}
          subtitle={word.defs?.[0]}
          detail={<List.Item.Detail markdown={toDetailMarkdown(word)} />}
          actions={
            <ActionPanel>
              <Action
                title="Toggle Definitions"
                icon={Icon.AppWindowSidebarLeft}
                onAction={() => setShowDetails(!showDetails)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
