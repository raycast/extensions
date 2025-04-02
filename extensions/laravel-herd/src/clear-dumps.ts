import { showHUD } from "@raycast/api";
import { Herd } from "./utils/Herd";

export default async function main() {
  await showHUD("Clearing Dumps");

  await Herd.Dumps.clear();
}
