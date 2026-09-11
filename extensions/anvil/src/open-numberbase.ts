import { launchAnvilURL } from "./launch-anvil";

export default async function OpenNumberbaseCommand() {
  await launchAnvilURL("anvil://tool/numberbase");
}
