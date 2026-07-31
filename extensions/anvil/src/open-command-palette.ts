import { launchAnvilURL } from "./launch-anvil";

export default async function OpenCommandPaletteCommand() {
  await launchAnvilURL("anvil://command/command.open-palette");
}
