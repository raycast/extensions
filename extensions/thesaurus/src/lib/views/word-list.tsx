import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useShallow } from "zustand/shallow";
import constants from "../constants";
import useStore from "../store";
import { SingleWord } from "../types/types";

const WordList = ({
  type = "Synonym",
  asIn,
  definition,
  words,
}: {
  type: "Synonym" | "Antonym";
  asIn: string;
  definition: string;
  words: SingleWord[];
}) => {
  const { pop } = useNavigation();
  const { setWord, setResults } = useStore(
    useShallow((state) => ({
      setWord: state.setWord,
      setResults: state.setResults,
    })),
  );

  const copyTitle = `Copy ${type}`;

  return (
    <List>
      <List.Section title={asIn} subtitle={definition}>
        {words.map((word, index) => (
          <List.Item
            key={index}
            title={word.word}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title={copyTitle} content={word.word} />
                <Action
                  title="Search for Word"
                  icon={Icon.MagnifyingGlass}
                  onAction={() => {
                    setWord(word.word);
                    setResults(undefined);
                    pop();
                  }}
                />
                <Action.OpenInBrowser
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                  title="View Definition"
                  url={`${constants.links.dictionary}${word.word}`}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
};

export default WordList;
