import { getSelectedText } from "@raycast/api";

export async function getSelectedTextContent(): Promise<string | undefined> {
  let selection;
  try {
    selection = await getSelectedText();
  } catch (error) {
    console.warn("Could not get selected text", error);
  }
  return selection;
}
