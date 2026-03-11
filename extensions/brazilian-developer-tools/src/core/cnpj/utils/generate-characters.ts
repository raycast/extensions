export const generateCharacters = (alphanumeric: boolean) => {
  let characters = "";
  const multiplier = alphanumeric ? 43 : 10;

  for (let i = 0; i < 12; ++i) {
    let ascii = 0;

    do {
      const a = Math.random();
      ascii = Math.floor(a * multiplier) + 48;
    } while (ascii > 57 && ascii < 65);

    characters += String.fromCodePoint(ascii);
  }

  return characters;
};
