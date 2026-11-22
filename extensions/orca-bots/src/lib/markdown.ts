/** Met chaque ligne dans un bloc de citation : les `*`, `_` ou backticks du texte ne cassent pas le rendu. */
export const quote = (text: string): string =>
  text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
