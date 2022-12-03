import { Clipboard } from "@raycast/api";
import { showFocus } from "./utils";

export default async function clipboardFocus() {
  return showFocus({
    text: await Clipboard.readText() ?? "",
  });
}
