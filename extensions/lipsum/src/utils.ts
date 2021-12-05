import { LoremIpsum } from "lorem-ipsum";

export const lorem = new LoremIpsum({
  sentencesPerParagraph: {
    max: 8,
    min: 4
  },
  wordsPerSentence: {
    max: 16,
    min: 4
  }
});

export const getTitle = (name: string, count: number) => {
  return count > 1 ? `Generate ${count} ${name}s` : `Generate a ${name}`;
}