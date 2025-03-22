import { fetchInputItem } from "./utils/input-item";
import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";

import { undecorate } from "./unicode-db/unicode-text-undecorator";
import { actionAfterDecoration } from "./types/preferences";

export default async () => {
  await closeMainWindow();
  await undecorateText();
};

export const undecorateText = async () => {
  const inputItem = await fetchInputItem();
  const decoratedText = undecorate(inputItem);
  if (actionAfterDecoration === "Paste") {
    await Clipboard.paste(decoratedText);
    await showHUD(`📋 ${decoratedText}`);
  } else {
    await Clipboard.copy(decoratedText);
    await showHUD(`📋 ${decoratedText}`);
  }
};
