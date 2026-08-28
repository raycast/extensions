import { launchAnvilURL } from "./launch-anvil";

export default async function OpenYamlCommand() {
  await launchAnvilURL("anvil://tool/yaml");
}
