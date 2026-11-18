import { launchAnvilURL } from "./launch-anvil";

export default async function OpenBackslashescapeCommand() {
  await launchAnvilURL("anvil://tool/backslashescape");
}
