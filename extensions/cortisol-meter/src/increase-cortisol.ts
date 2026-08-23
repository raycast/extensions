import { showHUD } from "@raycast/api";

import { formatLevel, increaseCortisolLevel, refreshMenuBar } from "./cortisol";

export default async function Command() {
  const level = await increaseCortisolLevel();
  await showHUD(`Cortisol: ${formatLevel(level)}`);
  await refreshMenuBar();
}
