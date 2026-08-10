import { showHUD, PopToRootType, Clipboard } from "@raycast/api";
import { POST } from "./common/api";
import { PasteCreateResponse } from "./common/types";
import { getPrefs } from "./common/prefs";
import { generateRandomTitle } from "./common/util";

export default async function Command() {
  const response: PasteCreateResponse = await POST("pastebin", {
    title: generateRandomTitle(),
    content: await Clipboard.readText(),
  });

  await showHUD(`Copied to clipboard!`, {
    clearRootSearch: true,
    popToRootType: PopToRootType.Immediate,
  });

  const prefs = getPrefs();
  Clipboard.copy(`https://paste.lol/${prefs.username}/${response.title}`);
}
