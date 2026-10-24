import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { getMe } from "./lib/api";
import { failToast } from "./lib/ui";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Getting your link" });
  try {
    const me = await getMe();
    await Clipboard.copy(me.pageUrl);
    await toast.hide();
    await showHUD("Copied your booking link");
  } catch (e) {
    await toast.hide();
    await failToast(e, "Couldn't copy your link");
  }
}
