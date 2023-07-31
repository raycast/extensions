import { Language, kbdKeys } from "../data";

type Props = {
  input: string;
  switchFrom: Language;
  switchTo: Language;
};

export function transformText({ input, switchFrom, switchTo }: Props) {
  return input
    .trim()
    .split("")
    .map((char) => {
      const idx = kbdKeys[switchFrom].indexOf(char);

      if (idx !== -1) {
        return kbdKeys[switchTo][idx];
      }

      return char;
    })
    .join("");
}
