import { launchAnvilURL } from "./launch-anvil";

export default async function OpenSubnetCommand() {
  await launchAnvilURL("anvil://tool/subnet");
}
