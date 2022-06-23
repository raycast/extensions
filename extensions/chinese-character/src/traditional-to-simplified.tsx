import { tw2cn } from "cjk-conv";
import { fetchInputItem } from "./utils/input-item";
import { Clipboard, getPreferenceValues, showHUD } from "@raycast/api";
import { Preferences } from "./types/preferences";

export default async () => {
  const { actionAfterConversion } = getPreferenceValues<Preferences>();
  const inputItem = await fetchInputItem();
  const cn = tw2cn(inputItem, { safe: false });
  if (actionAfterConversion === "Paste") {
    await Clipboard.paste(cn);
    await showHUD(`Paste: ${cn}`);
  } else {
    await Clipboard.copy(cn);
    await showHUD(`Copy: ${cn}`);
  }
};
