import { closeMainWindow, copyTextToClipboard, pasteText, showHUD } from "@raycast/api";
import { LoremIpsum } from "lorem-ipsum";
import createIpsum from "corporate-ipsum";

const generator = new LoremIpsum({
  sentencesPerParagraph: {
    max: 8,
    min: 4,
  },
  wordsPerSentence: {
    max: 16,
    min: 4,
  },
});

export const generateParagraph = (type: string) => {
  return type == "lorem" ? generator.generateSentences(10) : createIpsum(10);
};

export const generateSentence = (type: string) => {
  return type == "lorem" ? generator.generateSentences(1) : createIpsum(1);
};

export const notify = () => {
  showHUD("📋  Copied to clipboard");
};

export const preformAction = async (action: string, output: string) => {
  switch (action) {
    case "clipboard":
      await copyTextToClipboard(output);
      await notify();
      break;

    case "paste":
      await pasteText(output);
      break;
  }

  await closeMainWindow();
};
