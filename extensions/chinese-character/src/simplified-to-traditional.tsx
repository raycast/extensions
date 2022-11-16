import { cn2tw } from "cjk-conv";
import { fetchInputItem } from "./utils/input-item";
import { Clipboard, getPreferenceValues, showHUD } from "@raycast/api";
import { Preferences } from "./types/preferences";

export default async () => {
  const { actionAfterConversion } = getPreferenceValues<Preferences>();
  const inputItem = await fetchInputItem();
  const tw = cn2tw(inputItem, { safe: false });
  if (actionAfterConversion === "Paste") {
    await Clipboard.paste(tw);
    await showHUD(`Paste: ${tw}`);
  } else {
    await Clipboard.copy(tw);
    await showHUD(`Copy: ${tw}`);
  }
};
