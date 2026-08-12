import { Clipboard, getPreferenceValues, getSelectedText, showHUD, showToast, Toast } from "@raycast/api";
import { shorten } from "./utils";

export default async function Command() {
  const { clipboard } = getPreferenceValues<Preferences>();
  const toast = await showToast(Toast.Style.Animated, "Shortening URL");
  try {
    const url = await getSelectedText();
    const shortlink = await shorten(url);
    if (clipboard == "1") {
      await Clipboard.paste(shortlink);
      await showHUD("Pasted URL to Active Window");
    } else {
      await Clipboard.copy(shortlink);
      await showHUD("Copied URL to Clipboard");
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `${error || "Can't get selected text"}`;
  }
}
