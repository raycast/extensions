import { showHUD } from "@raycast/api";

export default async function Command() {
  const d20Roll: string = Math.ceil(Math.random() * 20).toString();

  await showHUD("🎲 You roll: " + d20Roll);
}
