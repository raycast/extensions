import { cn2tw } from "cjk-conv";
import { fetchInputItem } from "./utils/input-item";
import { Clipboard, getPreferenceValues, showHUD } from "@raycast/api";
import { Preferences } from "./types/preferences";

export default async () => {
  const { actionAfterConversion, simplifiedToTraditionalQuoteStyle } = getPreferenceValues<Preferences>();
  const inputItem = await fetchInputItem();
  const tw = cn2tw(inputItem, { safe: false });
  let finalTw = tw;
  if (simplifiedToTraditionalQuoteStyle) {
    finalTw = tw.replace(/‘/g, "「").replace(/’/g, "」").replace(/“/g, "『").replace(/”/g, "』");
  }
  if (actionAfterConversion === "Paste") {
    await Clipboard.paste(finalTw);
    await showHUD(`Paste: ${finalTw}`);
  } else {
    await Clipboard.copy(finalTw);
    await showHUD(`Copy: ${finalTw}`);
  }
};
