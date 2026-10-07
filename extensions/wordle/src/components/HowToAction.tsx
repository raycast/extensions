import { Action, Detail, environment, Icon } from "@raycast/api";
import { WORD_LENGTH, GUESS_LIMIT } from "@src/constants";
import { HintType } from "@src/types";
import { getExampleRowMarkdown } from "@src/util/board";

const getMarkdown = () => {
  const { theme } = environment;
  const exampleRow = (word: string, revealedIndex: number, type: HintType) =>
    getExampleRowMarkdown(
      Array.from(word).map((letter, index) => ({ letter, type: index === revealedIndex ? type : undefined })),
      theme
    );

  return `
Guess the word in **${GUESS_LIMIT}** tries. Each guess must be a valid **${WORD_LENGTH}**-letter word, and the color of the tiles changes to show how close your guess was.

${exampleRow("weary", 0, HintType.CORRECT_POSITION)}

**W** is in the word and in the correct spot.

${exampleRow("pills", 1, HintType.INCORRECT_POSITION)}

**I** is in the word but in the wrong spot.

${exampleRow("vague", 3, HintType.NON_EXISTENT)}

**U** is not in the word in any spot.

A new puzzle is released daily at midnight.
`;
};

export const HowToAction = () => (
  <Action.Push
    icon={Icon.Book}
    title="How To Play"
    target={<Detail navigationTitle="How To Play" markdown={getMarkdown()} />}
  />
);
