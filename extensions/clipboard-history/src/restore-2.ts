import { showHUD } from "@raycast/api";
import { get, loadHistory } from "./clipboard";
import { setClipboard } from "./utils";

export default async function () {
  await loadHistory();
  const text = get(1);
  if (!text) {
    await showHUD("No history");
    return;
  }
  await setClipboard(text);
  await showHUD("Restored #2");
}
