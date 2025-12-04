import { Clipboard } from "@raycast/api";
import { handleSave } from "./utils/handleSave";

export default async function Main() {
  const url = await Clipboard.readText();
  await handleSave(url);
}
