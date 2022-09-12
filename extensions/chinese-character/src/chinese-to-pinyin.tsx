import { Clipboard, getPreferenceValues, showHUD } from "@raycast/api";
import { pinyin } from "pinyin-pro";
import { fetchInputItem } from "./utils/input-item";
import { Preferences } from "./types/preferences";

export default async () => {
  const { actionAfterConversion } = getPreferenceValues<Preferences>();
  const inputItem = await fetchInputItem();
  const _pinyin = pinyin(inputItem);
  if (actionAfterConversion === "Paste") {
    await Clipboard.paste(_pinyin);
    await showHUD(`Paste: ${_pinyin}`);
  } else {
    await Clipboard.copy(_pinyin);
    await showHUD(`Copy: ${_pinyin}`);
  }
};
