import { getSelectedText } from "@raycast/api";
import { startFocus } from "./utils";

export default async function selectedFocus() {
  return startFocus({
    text: await getSelectedText(),
  });
}
