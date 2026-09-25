import { AI, showHUD } from "@raycast/api";

export default async function Command() {
  await AI.refreshModels();
  await showHUD("Refreshed OpenCode models");
}
