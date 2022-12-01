import { Clipboard } from "@raycast/api";
import { startFocus } from "./utils";

export default async function clipboardFocus() {
  return startFocus({
    text: await Clipboard.readText() ?? "",
  });
}
