import { showHUD } from "@raycast/api";
import { Herd } from "./utils/Herd";
import { rescue } from "./utils/rescue";

export default async function main() {
  await showHUD("Clearing Dumps");
  await rescue(() => Herd.Dumps.clear(), "Failed to clear Dumps.");
}
