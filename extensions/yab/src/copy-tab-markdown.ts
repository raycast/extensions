import { Clipboard, showHUD } from "@raycast/api";
import { attempt } from "./components";
import { frontTabOrSay } from "./current-tab";

export default async function Command() {
  await attempt("Couldn't read the tab", async () => {
    const tab = await frontTabOrSay();
    if (!tab) return;
    const title = (tab.title || tab.url).replace(/[[\]]/g, "");
    await Clipboard.copy({ text: `[${title}](${tab.url})`, html: `<a href="${tab.url}">${title}</a>` });
    await showHUD(`Copied “${title}”`);
  });
}
