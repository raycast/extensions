import { Language, languages } from "../data";

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
      const idx = languages[langFrom].kbdKeys.indexOf(char);

      if (idx !== -1) {
        return languages[langTo].kbdKeys[idx];
      }

      return char;
    })
    .join("");
}
