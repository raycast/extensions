import { Clipboard, showHUD, popToRoot } from "@raycast/api";
import { titleCase } from "title-case";

export const isEmpty = (string: string | null | undefined) => {
  return string === null || String(string).length === 0;
};

export default async () => {
  const clipboardText = await Clipboard.readText();

  if (isEmpty(clipboardText) || !clipboardText) {
    await showHUD("No Text in Clipboard");
    return;
  } else {
    const titleCaseText = titleCase(clipboardText);
    await Clipboard.paste(titleCaseText);
    popToRoot({ clearSearchBar: true });
    await showHUD("✍🏻 Pasted as Title Case Text");
  }
};
