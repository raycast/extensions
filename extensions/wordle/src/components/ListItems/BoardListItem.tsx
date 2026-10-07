import { Action, ActionPanel, environment, Icon, List } from "@raycast/api";
import { GUESS_LIMIT, WORD_LENGTH } from "@src/constants";
import { UseTextInputReturnType, UseWordleReturnType } from "@src/hooks";
import { showErrorToast } from "@src/util";
import { getBoardMarkdown } from "@src/util/board";
import { HowToAction } from "@src/components";

type BoardListItemProps = {
  wordleProperties: UseWordleReturnType;
  textInputProperties: UseTextInputReturnType;
};

export const BoardListItem = ({ wordleProperties, textInputProperties }: BoardListItemProps) => {
  const { guesses, guessCount, language, checkIfWordExists, makeGuess } = wordleProperties;
  const { state, isEmpty, length, hasCorrectLength } = textInputProperties;
  const [guessInput, setGuessInput] = state;
  const guessInputInLowercase = guessInput.toLowerCase();

  const isExistingWord = checkIfWordExists(guessInputInLowercase);
  const isGuessUnique = !guesses.some((guess) => guess.word === guessInputInLowercase);
  const isValidGuess = hasCorrectLength && isExistingWord && isGuessUnique;
  const isInputInvalid = length > WORD_LENGTH || (hasCorrectLength && !isValidGuess);

  const getStatus = (): { text: string; error?: string; icon: List.Item.Props["icon"] } => {
    if (isEmpty) return { text: `Type a ${WORD_LENGTH}-letter word`, error: "Not enough letters", icon: Icon.Circle };
    if (length < WORD_LENGTH)
      return { text: `${length}/${WORD_LENGTH} letters`, error: "Not enough letters", icon: Icon.Circle };
    if (length > WORD_LENGTH)
      return {
        text: `${length}/${WORD_LENGTH} letters`,
        error: "Too many letters",
        icon: "result-loss.svg",
      };
    if (!isGuessUnique)
      return {
        text: "Already guessed",
        error: "Already guessed",
        icon: "result-loss.svg",
      };
    if (!isExistingWord)
      return {
        text: "Invalid word",
        error: "Not in word list",
        icon: "result-loss.svg",
      };
    return { text: "Valid word", icon: "result-win.svg" };
  };
  const status = getStatus();

  const detail = (
    <List.Item.Detail
      markdown={getBoardMarkdown({
        guesses,
        input: guessInputInLowercase,
        isInputInvalid,
        language,
        theme: environment.theme,
      })}
    />
  );
  const actions = (
    <ActionPanel>
      <Action
        icon={Icon.LightBulb}
        title="Make Guess"
        onAction={async () => {
          if (!isValidGuess) return showErrorToast({ title: status.error ?? "Invalid word" });
          await makeGuess(guessInputInLowercase);
          setGuessInput("");
        }}
      />
      <HowToAction />
    </ActionPanel>
  );

  // Title-only rows: the list column is narrow, so a title plus subtitle would get truncated.
  return (
    <>
      <List.Item
        icon={Icon.Pencil}
        title={`Guess ${guessCount + 1} of ${GUESS_LIMIT}`}
        detail={detail}
        actions={actions}
      />
      <List.Item icon={status.icon} title={status.text} detail={detail} actions={actions} />
    </>
  );
};
