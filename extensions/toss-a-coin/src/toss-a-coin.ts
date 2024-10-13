import { showHUD } from "@raycast/api";
export default async function Command() {
  const result = Math.ceil(Math.random()*10)%2 === 0 ? "Heads!" : "Tails!";
  await showHUD(`🪙 ${result}`);
}
