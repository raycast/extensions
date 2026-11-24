import { showHUD } from "@raycast/api";
import { getRows, refreshAddRowSubtitle, setRows } from "./storage";

export default async function Command() {
  const current = await getRows();
  if (current === 0) {
    await showHUD("🧶 Already at row 0");
    return;
  }

  const rows = current - 1;
  await setRows(rows);
  await refreshAddRowSubtitle();
  await showHUD(`🧶 Back to row ${rows}`);
}
