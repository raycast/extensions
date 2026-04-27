import { Clipboard, open, showHUD } from "@raycast/api";

export default async function main() {
  const text = await Clipboard.readText();

  if (!text || text.trim() === "") {
    await showHUD("Clipboard is empty ❌");
    return;
  }

  await showHUD("Opening in TableXport...");
  
  const encodedData = encodeURIComponent(text);
  await open(`https://tablexport.com?data=${encodedData}&autoPaste=true`);
}
