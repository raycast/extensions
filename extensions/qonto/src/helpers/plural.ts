export const plural = (word: string, number: number) => {
  if (number <= 1) return word;

  if (word.endsWith("y")) {
    return word.slice(0, -1) + "ies";
  } else if (word.endsWith("s")) {
    return word + "es";
  } else {
    return word + "s";
  }
};
