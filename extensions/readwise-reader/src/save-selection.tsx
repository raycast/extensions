import { getSelectedText } from "@raycast/api";
import { handleSave } from "./utils/handleSave";
import handleError from "./utils/handleError";

export default async function Main() {
  try {
    const url = await getSelectedText();
    await handleSave(url);
  } catch (error) {
    handleError(error as Error);
  }
}
