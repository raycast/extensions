export function sortWeights(weights: string[]): string[] {
  const weightOrder: { [key: string]: number } = {
    ultrathin: 50,
    ultralight: 50,
    thin: 100,
    extralight: 200,
    light: 300,
    regular: 400,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
    heavy: 900,
  };

  const toTitleCase = (str: string): string => {
    return str.toLowerCase().replace(/(?:^|\s)\w/g, (letter) => letter.toUpperCase());
  };

  const { regularWeights, italicWeights } = weights.reduce(
    (acc, weight) => {
      const isItalic = weight.toLowerCase().includes("italic");
      const cleanWeight = weight.toLowerCase().replace(/\s*italic\s*/i, "");

      if (isItalic) {
        acc.italicWeights.push(cleanWeight);
      } else {
        acc.regularWeights.push(cleanWeight);
      }

      return acc;
    },
    { regularWeights: [] as string[], italicWeights: [] as string[] },
  );

  const sortByWeight = (weights: string[]): string[] => {
    return weights.sort((a, b) => {
      const weightA = weightOrder[a] || 0;
      const weightB = weightOrder[b] || 0;
      return weightA - weightB;
    });
  };

  const sortedRegular = sortByWeight(regularWeights).map(toTitleCase);
  const sortedItalic = sortByWeight(italicWeights)
    .map((weight) => `${toTitleCase(weight)} Italic`)
    .map((str) => str.trim());

  return [...sortedRegular, ...sortedItalic];
}
