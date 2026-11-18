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

const formatPOS = (detailStr: string) => {
  return detailStr.replace(/(\w+)\t/, "`$1` ");
};

const toDetailMarkdown = (word: Word) => {
  return "# " + word.word + "\n---\n" + (word.defs?.map(formatPOS).join("\n\n") || "");
};

export default function Command() {
  const [query, setQuery] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  const { isLoading, data } = useFetch<Word[]>("https://api.datamuse.com/words?qe=ml&md=d&ml=" + toQueryString(query), {
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
          subtitle={word.defs?.[0] ? word.defs[0] : undefined}
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
