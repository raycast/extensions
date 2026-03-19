import { showHUD } from "@raycast/api";
import { clearAllCaches } from "./clockodo";

export default function () {
  clearAllCaches();
  showHUD("Caches cleared");
}
