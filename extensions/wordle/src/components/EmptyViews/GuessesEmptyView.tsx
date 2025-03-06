import { List } from "@raycast/api";
import { WORD_LENGTH } from "@src/constants";

export const GuessesEmptyView = () => (
  <List.EmptyView
    title={`Think of a word with ${WORD_LENGTH} letters`}
    description={`Open the "How To Play" section to see instructions.`}
    icon={{ source: "thinking-face.png" }}
  />
);
