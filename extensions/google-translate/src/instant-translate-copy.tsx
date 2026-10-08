import { Clipboard, showHUD } from "@raycast/api";
import { baseInstantTranslate } from "./instant-translate";

export default async function InstantTranslateCopy() {
  await baseInstantTranslate(async (translatedText) => {
    await Clipboard.copy(translatedText);
    await showHUD(`✓ Copied To Clipboard`);
  });
}
