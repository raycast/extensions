// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import utd from "unicode-text-decorator";
import { fetchInputItem } from "./utils/input-item";
import { Clipboard, closeMainWindow, getPreferenceValues, LocalStorage, showHUD } from "@raycast/api";
import { Preferences } from "./types/preferences";
import { fontFamily, LocalStorageKey } from "./utils/constants";

export default async () => {
  const localStorage = await LocalStorage.getItem<string>(LocalStorageKey.STAR_TEXT_FONT);
  const _starTextFont = typeof localStorage === "undefined" ? fontFamily[0].value : localStorage;

  await decorateText(_starTextFont);
  await closeMainWindow({ clearRootSearch: true });
};

export const decorateText = async (textFont: string) => {
  const { actionAfterDecoration } = getPreferenceValues<Preferences>();
  const inputItem = await fetchInputItem();
  const decoratedText = utd.decorate(inputItem, textFont, { fallback: true });
  if (actionAfterDecoration === "Paste") {
    await Clipboard.paste(decoratedText);
    await showHUD(`Paste: ${decoratedText}`);
  } else {
    await Clipboard.copy(decoratedText);
    await showHUD(`Copy: ${decoratedText}`);
  }
};
