import { Clipboard, open, showHUD } from "@raycast/api";

export default async function command() {
  const text = await Clipboard.readText();
  if (text) {
    await showHUD("Opening in TableXport...");
    await open("https://tablexport.com?autoPaste=true");
  }
}
