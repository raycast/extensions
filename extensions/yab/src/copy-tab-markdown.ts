import { Clipboard, showHUD } from "@raycast/api";
import { attempt } from "./components";
import { frontTabOrSay } from "./current-tab";

export default async function Command() {
  await attempt("Couldn't read the tab", async () => {
    const tab = await frontTabOrSay();
    if (!tab) return;
    const title = (tab.title || tab.url).replace(/[[\]]/g, "");
    const html = (value: string) =>
      value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    await Clipboard.copy({ text: `[${title}](${tab.url})`, html: `<a href="${html(tab.url)}">${html(title)}</a>` });
    await showHUD(`Copied “${title}”`);
  });
}
