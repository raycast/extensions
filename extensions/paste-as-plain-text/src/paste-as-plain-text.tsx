import { captureException, LaunchProps, showHUD } from "@raycast/api";
import { getArgument, isEmpty } from "./utils/common-utils";
import { PasteFormat } from "./types/types";
import { pasteAs } from "./utils/paste-as-utils";

interface PasteAsArguments {
  advancedPasteFormat: string;
}

export default async (props: LaunchProps<{ arguments: PasteAsArguments }>) => {
  try {
    const advancedPasteFormat_ = getArgument(props.arguments.advancedPasteFormat, "PasteAs");
    const advancedPasteFormat = isEmpty(advancedPasteFormat_) ? PasteFormat.PLAIN_TEXT : advancedPasteFormat_;
    await pasteAs(advancedPasteFormat);
  } catch (e) {
    captureException(e);
    console.error(e);
    await showHUD("🚨 " + e);
  }
};
