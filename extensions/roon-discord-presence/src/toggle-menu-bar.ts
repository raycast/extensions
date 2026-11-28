import { showHUD } from "@raycast/api";
import { isMenuBarHidden, setMenuBarHidden } from "./visibility";

export default async function Command() {
  const hidden = !isMenuBarHidden();
  await setMenuBarHidden(hidden);
  await showHUD(hidden ? "Menu bar icon hidden" : "Menu bar icon shown");
}
