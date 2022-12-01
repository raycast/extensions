import { getSelectedText } from "@raycast/api";
import { showFocus } from "./utils";

export default async function selectedFocus() {
  return showFocus({
    text: await getSelectedText(),
  });
}
