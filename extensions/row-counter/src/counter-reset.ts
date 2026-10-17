import { showHUD } from "@raycast/api";
import { setRows } from "./storage";

export default async function Command() {
  await setRows(0);
  await showHUD("🧶 Counter reset to 0");
}
