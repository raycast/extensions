import { launchAnvilURL } from "./launch-anvil";

export default async function OpenJsonCommand() {
  await launchAnvilURL("anvil://tool/json");
}
