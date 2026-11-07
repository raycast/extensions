import { Clipboard, showHUD } from "@raycast/api";
import { attempt } from "./components";
import { frontTabOrSay } from "./current-tab";

export default async function Command() {
  await attempt("Couldn't read the tab", async () => {
    const tab = await frontTabOrSay();
    if (!tab) return;
    await Clipboard.copy(tab.url);
    await showHUD(`Copied ${tab.url}`);
  });
}
