import { launchAnvilURL } from "./launch-anvil";

export default async function OpenTomlCommand() {
  await launchAnvilURL("anvil://tool/toml");
}
