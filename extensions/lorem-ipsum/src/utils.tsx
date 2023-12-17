import { closeMainWindow, Clipboard, showHUD, getPreferenceValues } from "@raycast/api";
import { LoremIpsum } from "lorem-ipsum";

// don't want to cause a heap error, so cap it 😱
const LOREM_IPSUM_MAX_NUMBER = 1000;

const loremIpsumOptions = {
  sentencesPerParagraph: {
    max: 8,
    min: 4,
  },
  wordsPerSentence: {
    max: 16,
    min: 4,
  },
};

const generator = new LoremIpsum(loremIpsumOptions);

export const generateParagraphs = (count: number) => {
  return Array.from(Array(count))
    .map(() =>
      generator.generateSentences(
        Math.floor(
          Math.random() *
            (loremIpsumOptions.sentencesPerParagraph.max - loremIpsumOptions.sentencesPerParagraph.min + 1),
        ) + loremIpsumOptions.sentencesPerParagraph.min,
      ),
    )
    .join("\r\n\r\n"); // newline + seperator line
};

export const generateSentences = (count: number) => {
  return generator.generateSentences(count);
};

export const generateWords = (count: number) => {
  return generator.generateWords(count);
};

export const safeLoremIpsumNumberArg = async (arg: string | undefined) => {
  if (!arg) {
    arg = "1";
  }

  try {
    const parseableNumber = parseInt(arg, 10);

    // number and valid/within range?
    if (isNaN(parseableNumber) || parseableNumber > LOREM_IPSUM_MAX_NUMBER) {
      return {
        error: {
          message: `Please enter a valid integer number, no more than ${LOREM_IPSUM_MAX_NUMBER}`,
        },
        safeLoremIpsumNumber: null,
      };
    }

    // all good
    return {
      error: null,
      safeLoremIpsumNumber: parseableNumber,
    };
  } catch (e) {
    // generic error
    return {
      error: {
        message: "Something went wrong",
      },
      safeLoremIpsumNumber: null,
    };
  }
};

export const produceOutput = async (content: string) => {
  const { action: preference = "clipboard" } = getPreferenceValues();

  switch (preference) {
    case "clipboard":
      await Clipboard.copy(content);
      showHUD("Copied to clipboard! 📋");
      break;

    case "paste":
      await Clipboard.paste(content);
      showHUD("Pasted to active app! 📝");
      break;
  }

  await closeMainWindow();
};
