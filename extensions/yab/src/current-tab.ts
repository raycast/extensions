import { showHUD } from "@raycast/api";
import { focusedTab } from "./yab";

export async function frontTabOrSay() {
  const tab = await focusedTab();
  if (!tab) await showHUD("No tab in front in Yab");
  return tab;
}
