import { Clipboard, showHUD } from "@raycast/api";
import { covertTypeScriptToJavaScript } from "./internal/typescript-to-javascript";

export default async function main() {
  const typescriptCode = await Clipboard.readText();
  if (!typescriptCode) {
    await showHUD("No text found in clipboard");
    return;
  }

  const javascriptCode = await covertTypeScriptToJavaScript(typescriptCode);

  await Clipboard.paste(javascriptCode);
}
