import type { QueryInput } from "@/core/results/types";

const maxWordLength = 20;

function checkIsWordLength(word: string) {
  return word.trim().length < maxWordLength;
}

export function checkIsWord(queryWordInfo: QueryInput) {
  if (queryWordInfo.isWord !== undefined) {
    return queryWordInfo.isWord;
  }
  return checkIsWordLength(queryWordInfo.word);
}
