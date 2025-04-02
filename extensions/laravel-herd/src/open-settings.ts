import { showHUD } from "@raycast/api";
import { Herd } from "./utils/Herd";

export default async function main() {
  await showHUD("Open settings");

  await Herd.General.openSettings("general");
}
