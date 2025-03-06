import { ActionPanel, List } from "@raycast/api";
import { HINT_TYPE_COLOR_MAP } from "@src/constants";
import { Guess } from "@src/types";
import { getUppercaseValue } from "@src/util";
import { HowToAction } from "@src/components";

type PastGuessListItemProps = {
  guess: Guess;
  index: number;
};

export const PastGuessListItem = ({ guess, index }: PastGuessListItemProps) => (
  <List.Item
    icon={`guess-icon.png`}
    title={`${index}. ${getUppercaseValue(guess.word)}`}
    accessories={guess.hints.map((hint) => ({
      tag: {
        value: getUppercaseValue(hint.value),
        color: HINT_TYPE_COLOR_MAP[hint.type],
      },
    }))}
    actions={
      <ActionPanel>
        <HowToAction />
      </ActionPanel>
    }
  />
);
