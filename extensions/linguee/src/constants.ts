export const validLanguagePairKeys = [
  "english-german",
  "english-chinese",
  "english-french",
  "english-italian",
  "english-spanish",
] as const;

export type ValidLanguagePairKey = typeof validLanguagePairKeys[number];

export const validLanguagePairs: Record<
  typeof validLanguagePairKeys[number],
  {
    pair: string;
    title: string;
  }
> = {
  "english-german": {
    pair: "english-german",
    title: "English ↔️ German",
  },
  "english-chinese": {
    pair: "english-chinese",
    title: "English ↔️ Chinese",
  },
  "english-french": {
    pair: "english-french",
    title: "English ↔️ French",
  },
  "english-italian": {
    pair: "english-italian",
    title: "English ↔️ Italian",
  },
  "english-spanish": {
    pair: "english-spanish",
    title: "English ↔️ Spanish",
  },
};
