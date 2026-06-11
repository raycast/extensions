import { showHUD } from "@raycast/api";
import { clearAllCaches } from "./clockodo";

export default async function () {
  clearAllCaches();
  await showHUD("Caches cleared");
}
