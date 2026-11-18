import { launchAnvilURL } from "./launch-anvil";

export default async function OpenHashCommand() {
  await launchAnvilURL("anvil://tool/hash");
}
