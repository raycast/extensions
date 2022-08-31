import { Action, ActionPanel, List } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { parse } from "node-html-parser";
import { useRef, useState } from "react";
import { fetch } from "undici";

import { environment } from "@raycast/api";

interface SearchArguments {
  word?: string;
}

const classNames = {
  "1n6g4vv": "yellow",
  "1gyuw4i": "orange",
  "1kg1yv8": "red",
};
// yellow: css-1n6g4vv eh475bn0
// orange: css-1gyuw4i eh475bn0
// red: css-1kg1yv8 eh475bn0
interface iWord {
  color: "red" | "orange" | "yellow" | "regular";
  word: string;
}
export default function Command(props: { arguments?: SearchArguments }) {
  const [word, setWord] = useState("");
  const abortable = useRef<AbortController>();
  const timeout = useRef<NodeJS.Timeout>();

  const { isLoading, data } = usePromise(
    async (word: string) => {
      const html = await fetch(`https://www.thesaurus.com/browse/${encodeURIComponent(word)}`).then((e) => e.text());
      const dom = parse(html);
      const words = dom.querySelectorAll("body #meanings div[data-testid=word-grid-container] ul a").map((u) => ({
        word: u.innerText,
        color: Object.keys(classNames).find(([key]) => u.classList.toString().includes(key))?.[1] || "regular",
      }));

      return words;
    },
    [props?.arguments?.word || word],
    {
      abortable,
    }
  );

  const _handleSearch = (word: string) => {
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setWord(word), 500);
  };

  return (
    <List
      enableFiltering={false}
      onSearchTextChange={_handleSearch}
      navigationTitle="Search word"
      searchBarPlaceholder="Search a word on Thesaurus"
      isLoading={isLoading && (!!word || !!props?.arguments?.word)}
    >
      {!word && !props?.arguments?.word && <List.EmptyView title="Search for a word to get started" />}
      <List.Section title="Synonyms">
        {data?.map((word) => (
          <List.Item
            // icon="list-icon.png"
            title={word.word}
            actions={
              <ActionPanel>
                {/* <Action.Push title="Show Details" target={<Detail markdown="# Hey! 👋" />} /> */}
                <Action.CopyToClipboard content={word.word} shortcut={{ modifiers: ["cmd"], key: "." }} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
