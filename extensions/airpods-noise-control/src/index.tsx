import { closeMainWindow, showHUD } from "@raycast/api";
import { runScript } from "./applescript";

export default async function main() {
  await closeMainWindow();
  const result = await runScript();
  await showHUD(result);
}
