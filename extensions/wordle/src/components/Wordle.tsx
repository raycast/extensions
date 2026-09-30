import { ActionPanel, List } from "@raycast/api";
import { WORD_LENGTH } from "@src/constants";
import { useTextInput, useWordle } from "@src/hooks";
import { HowToAction, GuessListViewController } from "@src/components";
import { Language } from "@src/types";

type WordleProps = {
  language: Language;
};

export const Wordle = ({ language }: WordleProps) => {
  const wordleProperties = useWordle(language);
  const { isLoading } = wordleProperties;
  const textInputProperties = useTextInput(WORD_LENGTH);
  const { state } = textInputProperties;
  const [guessInput, setGuessInput] = state;

  return (
    <List
      filtering={false}
      searchBarPlaceholder="Enter your guess"
      searchText={guessInput}
      onSearchTextChange={setGuessInput}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <HowToAction />
        </ActionPanel>
      }
    >
      <GuessListViewController wordleProperties={wordleProperties} textInputProperties={textInputProperties} />
    </List>
  );
};
