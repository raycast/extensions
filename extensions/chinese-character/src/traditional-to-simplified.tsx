import { tw2cn } from "cjk-conv";
import { fetchInputItem } from "./utils/input-item";
import { Clipboard, getPreferenceValues, LaunchProps, showHUD } from "@raycast/api";
import { Preferences } from "./types/preferences";
import { TextArguments } from "./types/types";

export default async (props: LaunchProps<{ arguments: TextArguments }>) => {
  const { text } = props.arguments;
  const { actionAfterConversion, traditionalToSimplifiedQuoteStyle } = getPreferenceValues<Preferences>();
  let input = text;
  if (!input) {
    input = await fetchInputItem();
  }
  const cn = tw2cn(input, { safe: false });
  let finalCn = cn;
  if (traditionalToSimplifiedQuoteStyle) {
    finalCn = cn.replace(/「/g, "‘").replace(/」/g, "’").replace(/『/g, "“").replace(/』/g, "”");
  }
  if (actionAfterConversion === "Paste") {
    await Clipboard.paste(finalCn);
    await showHUD(`📋 ${finalCn}`);
  } else {
    await Clipboard.copy(finalCn);
    await showHUD(`📋 ${finalCn}`);
  }
};
