import { Clipboard, showHUD, closeMainWindow, PopToRootType } from "@raycast/api";
import { recognizeText } from "./utils";

export default async function Command() {
  const { text, file } = await Clipboard.read();
  if (text.length < 5) {
    return await showHUD("❌ This is not an image");
  }
  if (text.substring(0, 5) != "Image") {
    return await showHUD("❌ This is not an image");
  }
  if (typeof file != "string") {
    return await showHUD("❌ This is not an image");
  }
  let filepath = file;
  if (file.substring(0, 7) == "file://") filepath = file.substring(7, file.length);
  const ocrResult = await recognizeText(filepath);
  // console.log("result = " + ocrResult);
  await Clipboard.copy(ocrResult);
  await closeMainWindow();
  return await showHUD("✅ Copied to clipboard");
}
