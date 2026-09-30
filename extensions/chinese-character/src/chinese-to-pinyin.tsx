import { Clipboard, getPreferenceValues, LaunchProps, showHUD } from "@raycast/api";
import { pinyin } from "pinyin-pro";
import { fetchInputItem } from "./utils/input-item";
import { Preferences } from "./types/preferences";
import { TextArguments } from "./types/types";

export default async (props: LaunchProps<{ arguments: TextArguments }>) => {
  const { text } = props.arguments;
  const { tones, actionAfterConversion } = getPreferenceValues<Preferences>();
  let input = text;
  if (!input) {
    input = await fetchInputItem();
  }
  let _pinyin: string;
  if (tones === "none") {
    _pinyin = pinyin(input, { toneType: "none" });
  } else if (tones === "num") {
    _pinyin = pinyin(input, { toneType: "num" });
  } else {
    _pinyin = pinyin(input);
  }
  if (actionAfterConversion === "Paste") {
    await Clipboard.paste(_pinyin);
    await showHUD(`📋 ${_pinyin}`);
  } else {
    await Clipboard.copy(_pinyin);
    await showHUD(`📋 ${_pinyin}`);
  }
};
