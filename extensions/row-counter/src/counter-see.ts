import { showHUD } from "@raycast/api";
import { getRows } from "./storage";

export default async function Command() {
  const rows = await getRows();
  const label = rows === 1 ? "row done" : "rows done";
  await showHUD(`🧶 ${rows} ${label}`);
}
