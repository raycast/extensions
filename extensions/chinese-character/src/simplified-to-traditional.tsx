import { cn2tw } from "cjk-conv";
import { fetchInputItem } from "./utils/input-item";
import { Clipboard, getPreferenceValues, LaunchProps, showHUD } from "@raycast/api";
import { Preferences } from "./types/preferences";
import { TextArguments } from "./types/types";

export default async (props: LaunchProps<{ arguments: TextArguments }>) => {
  const { text } = props.arguments;
  const { actionAfterConversion, simplifiedToTraditionalQuoteStyle } = getPreferenceValues<Preferences>();
  let input = text;
  if (!input) {
    input = await fetchInputItem();
  }
  const tw = cn2tw(input, { safe: false });
  let finalTw = tw;
  if (simplifiedToTraditionalQuoteStyle) {
    finalTw = tw.replace(/‘/g, "「").replace(/’/g, "」").replace(/“/g, "『").replace(/”/g, "』");
  }
  if (actionAfterConversion === "Paste") {
    await Clipboard.paste(finalTw);
    await showHUD(`📋 ${finalTw}`);
  } else {
    await Clipboard.copy(finalTw);
    await showHUD(`📋 ${finalTw}`);
  }
};
