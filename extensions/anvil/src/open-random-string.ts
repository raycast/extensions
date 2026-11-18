import { launchAnvilURL } from "./launch-anvil";

export default async function OpenRandomStringCommand() {
  await launchAnvilURL("anvil://tool/random-string");
}
