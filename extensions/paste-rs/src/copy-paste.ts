import { Clipboard } from "@raycast/api";
import { createPaste } from "./api";
import { addToHistory } from "./history";

export async function createAndCopyPaste(content: string, language: string) {
  const result = await createPaste(content, language);
  try {
    await Clipboard.copy(result.url);
  } catch {
    throw new Error(`Paste created but the URL could not be copied: ${result.url}`);
  }

  let historySaved = true;
  try {
    await addToHistory({ url: result.url, content, partial: result.partial });
  } catch {
    historySaved = false;
  }
  return { ...result, historySaved };
}
