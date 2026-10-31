import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { getAvailability, getMe } from "./lib/api";
import { suggest, timesMessage } from "./lib/format";
import { failToast } from "./lib/ui";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Finding your open times" });
  try {
    const [me, open] = await Promise.all([getMe(), getAvailability({ duration: 30 })]);
    const picks = suggest(open.slots);
    await toast.hide();
    if (!picks.length) {
      await showHUD("No open times in the next two weeks");
      return;
    }
    await Clipboard.copy(timesMessage(picks, me.pageUrl));
    await showHUD("Copied 3 open times and your link");
  } catch (e) {
    await toast.hide();
    await failToast(e, "Couldn't find open times");
  }
}
