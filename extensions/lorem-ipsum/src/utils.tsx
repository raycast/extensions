import { closeMainWindow, Clipboard, getPreferenceValues, showToast, Toast } from "@raycast/api";
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

export const showError = async (msg: string) => {
  await closeMainWindow();
  await showToast(Toast.Style.Failure, msg);
};

export const produceOutput = async (content: string) => {
  const { action } = getPreferenceValues();

  await closeMainWindow();

  switch (action) {
    case "clipboard":
      await Clipboard.copy(content);
      await showToast(Toast.Style.Success, "Copied to clipboard! 📋");
      break;

    case "paste":
      await Clipboard.paste(content);
      await showToast(Toast.Style.Success, "Pasted to active app! 📝");
      break;

    case "pasteAndCopy":
      await Clipboard.paste(content);
      await Clipboard.copy(content);
      await showToast(Toast.Style.Success, "Pasted to active app and copied to clipboard! 📋");
      break;
  }
};
