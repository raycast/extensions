import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { WORD_LENGTH } from "@src/constants";
import { UseTextInputReturnType, UseWordleReturnType } from "@src/hooks";
import { ValidatorAccessory } from "@src/types";
import { getUppercaseValue } from "@src/util";
import { HowToAction } from "@src/components";

type NewGuessListItemProps = {
  wordleProperties: UseWordleReturnType;
  textInputProperties: UseTextInputReturnType;
  index: number;
};

export const NewGuessListItem = ({ wordleProperties, textInputProperties, index }: NewGuessListItemProps) => {
  const { guesses, checkIfWordExists, makeGuess } = wordleProperties;
  const { state, length, hasCorrectLength } = textInputProperties;
  const [guessInput, setGuessInput] = state;
  const guessInputInLowercase = guessInput.toLowerCase();

  const isExistingWord = checkIfWordExists(guessInputInLowercase);
  const isGuessUnique = !guesses.map((guess) => guess.word).includes(guessInputInLowercase);
  const isValidGuess = hasCorrectLength && isExistingWord && isGuessUnique;

  const validatorAccessories: ValidatorAccessory[] = [
    {
      id: "unique-guess",
      accessory: {
        tag: {
          value: "Already guessed",
          color: Color.Red,
        },
      },
      validators: [hasCorrectLength, !isGuessUnique],
    },
    {
      id: "existing-word",
      accessory: {
        tag: {
          value: isExistingWord ? "Valid word" : "Invalid word",
          color: isExistingWord ? Color.Green : Color.Red,
        },
      },
      validators: [hasCorrectLength],
    },
    {
      id: "word-length",
      accessory: {
        tag: {
          value: `${length}/${WORD_LENGTH} characters`,
          color: hasCorrectLength ? Color.Green : Color.Red,
        },
      },
      validators: [],
    },
  ];

  return (
    <List.Item
      icon={`guess-icon.png`}
      title={`${index}. ${getUppercaseValue(guessInputInLowercase)}`}
      accessories={validatorAccessories.filter((va) => va.validators.every((v) => v)).map((va) => va.accessory)}
      actions={
        <ActionPanel>
          {isValidGuess && (
            <Action
              icon={Icon.LightBulb}
              title="Make Guess"
              onAction={async () => {
                await makeGuess(guessInputInLowercase);
                setGuessInput("");
              }}
            />
          )}
          <HowToAction />
        </ActionPanel>
      }
    />
  );
};
