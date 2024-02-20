import { Alert, getSelectedText, showHUD, Clipboard } from "@raycast/api";

export const contents = async () => {
  let selectedText = "";
  let prompt = "";
  const optionalSelect = true;

  try {
    selectedText = await getSelectedText();
    if (!prompt) {
      prompt = selectedText;
    } else if (optionalSelect) {
      selectedText = "\n\n" + selectedText;
    }
  } catch (error) {
    if (!prompt) {
      throw "No text selected.";
    }
    if (!optionalSelect) {
      throw "Raycast was unable to get the selected text.";
    }
  }

  if (!selectedText) {
    throw "No text selected";
  } else {
    return selectedText;
  }
};

export const update = async (contents: string) => {
  await Clipboard.copy(contents);
  await Clipboard.paste(contents);
};
