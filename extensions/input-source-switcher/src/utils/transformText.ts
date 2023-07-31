import { Language, kbdKeys } from "../data";

type Props = {
  input: string;
  langFrom: Language;
  langTo: Language;
};

export function transformText({ input, langFrom, langTo }: Props) {
  return input
    .trim()
    .split("")
    .map((char) => {
      const idx = kbdKeys[langFrom].indexOf(char);

      if (idx !== -1) {
        return kbdKeys[langTo][idx];
      }

      return char;
    })
    .join("");
}
