import { environment, showHUD, showInFinder } from "@raycast/api";
import { join } from "path";
import { ensureSupportDirectories } from "./lib/paths";

export default async function Command() {
  ensureSupportDirectories();
  await showInFinder(join(environment.supportPath, "sessions"));
  await showHUD("Opened local feedback sessions");
}
