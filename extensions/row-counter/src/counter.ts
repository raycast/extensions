import { showHUD } from "@raycast/api";
import { getRows, setRows } from "./storage";

export default async function Command() {
  const rows = (await getRows()) + 1;
  await setRows(rows);
  await showHUD(`🧶 Row ${rows}`);
}
