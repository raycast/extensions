import { Clipboard } from "@raycast/api";
import { createPaste } from "./api";
import { addToHistory } from "./history";

export async function createAndCopyPaste(content: string, language: string) {
  const result = await createPaste(content, language);
  let historySaved = true;
  try {
    await addToHistory({ url: result.url, content, partial: result.partial });
  } catch {
    historySaved = false;
  }

  try {
    await Clipboard.copy(result.url);
  } catch {
    throw new Error(
      `${result.partial ? "Paste partially uploaded" : "Paste created"} but the URL could not be copied: ${result.url}` +
        (historySaved ? "" : " Local history could not be saved."),
    );
  }
  return { ...result, historySaved };
}
