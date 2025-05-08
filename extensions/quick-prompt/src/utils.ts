import { getSelectedText } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
export async function getSelectedTextContent(): Promise<string | undefined> {
  let selection;
  try {
    selection = await getSelectedText();
  } catch (error) {
    showFailureToast(error, { title: "Could not get selected text" });
  }
  return selection;
}
