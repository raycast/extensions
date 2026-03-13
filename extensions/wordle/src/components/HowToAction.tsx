import { Action, Detail, Icon } from "@raycast/api";
import { WORD_LENGTH, GUESS_LIMIT } from "@src/constants";

const markdown = `
  # How To Play
  &NewLine;
  Guess the Worlde in **${GUESS_LIMIT}** tries.
  
  - Each guess must be a valid **${WORD_LENGTH}**-letter word.
  - The color of the tiles will change to show how close your guess was to the word.
  &NewLine;
  ## Example
  
  ![alt text](how-to-play_color-example.png)
  
  1. \`B\` is in the word and in the correct spot.
  
  2. The first \`E\` is in the word but in the wrong spot.
  
  3. The second \`E\`, \`F\` and \`Y\` are not in the word at any spot.
  
  &NewLine;
  A new puzzle is released daily at midnight.
  `;

export const HowToAction = () => (
  <Action.Push
    icon={Icon.Book}
    title="How To Play"
    target={<Detail navigationTitle="How To Play" markdown={markdown} />}
  />
);
