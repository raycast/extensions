export function getAcronym(name: string): string {
  const words = name.split(/[\s-]+/); // Split name into words
  const numWords = words.length;

  let acronym = "";

  if (numWords === 1) {
    acronym = words[0].slice(0, 4).toUpperCase();
  } else if (numWords === 2) {
    acronym = `${words[0].slice(0, 2)}${words[1].slice(0, 2)}`.toUpperCase();
  } else if (numWords === 3) {
    acronym = `${words[0][0]}${words[1][0]}${words[2].slice(0, 2)}`.toUpperCase();
  } else if (numWords >= 4 && numWords <= 5) {
    acronym = words
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }

  return acronym;
}
