import { showHUD } from "@raycast/api";
import { Herd } from "./utils/Herd";
import { rescue } from "./utils/rescue";

export default async function main() {
  await showHUD("Open Dumps");
  await rescue(() => Herd.Dumps.open(), "Failed to open Dumps.");
}
