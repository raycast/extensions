import { LetterSet } from "./schema";

export function convert(text: string, letterSet: LetterSet) {
  return [...text]
    .map((char) => {
      return letterSet.characters[char] || char;
    })
    .join("");
}
