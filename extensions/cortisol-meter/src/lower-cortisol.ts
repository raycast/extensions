import { showHUD } from "@raycast/api";

import { formatLevel, lowerCortisolLevel, refreshMenuBar } from "./cortisol";

export default async function Command() {
  const level = await lowerCortisolLevel();
  await showHUD(`Cortisol: ${formatLevel(level)}`);
  await refreshMenuBar();
}
