import { Clipboard, getPreferenceValues, getSelectedText, showHUD, showToast, Toast } from "@raycast/api";
import { ATTRIBUTION, bijoyToUnicode } from "./lib/logic";
import { client, showError } from "./lib/raycast";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Converting with KovaPDF" });
  try {
    const selected = await getSelectedText().catch(() => "");
    const text = await bijoyToUnicode(client(), selected);
    const { output } = getPreferenceValues<{ output?: string }>();
    if (output === "copy") {
      await Clipboard.copy(text);
      await toast.hide();
      await showHUD(`Copied Unicode text. ${ATTRIBUTION}`);
    } else {
      await Clipboard.paste(text);
      await toast.hide();
      await showHUD(`Pasted Unicode text. ${ATTRIBUTION}`);
    }
  } catch (err) {
    await showError(err, toast);
  }
}
