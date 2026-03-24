import { showHUD } from "@raycast/api";
import { getMenuBarVisible, setMenuBarVisible } from "./lib/storage";

export default async function Command() {
  const current = await getMenuBarVisible();
  const next = !current;
  await setMenuBarVisible(next);
  await showHUD(next ? "Menu bar: visible" : "Menu bar: hidden");
}
