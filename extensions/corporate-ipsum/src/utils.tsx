import { closeMainWindow, copyTextToClipboard, pasteText, showHUD } from "@raycast/api";
import  createIpsum from 'corporate-ipsum';

export const generateParagraph = () => {
  return createIpsum(10)
};

export const generateSentence = () => {
  return createIpsum(1)
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
