import { getSelectedText } from "@raycast/api";
import { handleSave } from "./utils/handleSave";

export default async function Main() {
  const url = await getSelectedText();
  await handleSave(url);
}
