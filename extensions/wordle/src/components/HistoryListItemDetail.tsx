import { environment, List } from "@raycast/api";
import { EntryState, EntryStateColorMap, LocalStorageEntry } from "@src/types";
import { determineHints, getUppercaseValue } from "@src/util";
import { getBoardMarkdown } from "@src/util/board";

type HistoryListItemDetailProps = {
  entry: LocalStorageEntry;
  entryStateColorMap: EntryStateColorMap;
};

export const HistoryListItemDetail = ({ entry, entryStateColorMap }: HistoryListItemDetailProps) => {
  const { language, wordsOfGuesses, solution } = entry;

  const guesses = wordsOfGuesses.map((word) => ({ word, hints: determineHints(word, solution) }));
  const attemptCount = wordsOfGuesses.length;
  const solutionText = entryStateColorMap[EntryState.IN_PROGRESS].condition
    ? EntryState.IN_PROGRESS
    : getUppercaseValue(solution);

  // The caption lives inside the image: metadata rows would shrink the board and make the pane scroll.
  return (
    <List.Item.Detail
      markdown={getBoardMarkdown({
        guesses,
        input: "",
        isInputInvalid: false,
        language,
        theme: environment.theme,
        showKeyboard: false,
        caption: `${solutionText}  ·  ${attemptCount} ${attemptCount === 1 ? "attempt" : "attempts"}`,
      })}
    />
  );
};
