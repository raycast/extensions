import { showHUD } from "@raycast/api";
import { refreshAddRowSubtitle, setRows } from "./storage";

export default async function Command() {
  await setRows(0);
  await refreshAddRowSubtitle();
  await showHUD("🧶 Counter reset to 0");
}
