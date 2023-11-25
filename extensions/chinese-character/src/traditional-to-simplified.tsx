import { tw2cn } from "cjk-conv";
import { fetchInputItem } from "./utils/input-item";
import { Clipboard, getPreferenceValues, showHUD } from "@raycast/api";
import { Preferences } from "./types/preferences";

export default async () => {
  const { actionAfterConversion, traditionalToSimplifiedQuoteStyle } = getPreferenceValues<Preferences>();
  const inputItem = await fetchInputItem();
  const cn = tw2cn(inputItem, { safe: false });
  let finalCn = cn;
  if (traditionalToSimplifiedQuoteStyle) {
    finalCn = cn.replace(/「/g, "‘").replace(/」/g, "’").replace(/『/g, "“").replace(/』/g, "”");
  }
  if (actionAfterConversion === "Paste") {
    await Clipboard.paste(finalCn);
    await showHUD(`Paste: ${finalCn}`);
  } else {
    await Clipboard.copy(finalCn);
    await showHUD(`Copy: ${finalCn}`);
  }
};
