import { launchAnvilURL } from "./launch-anvil";

export default async function OpenJsonToCodeCommand() {
  await launchAnvilURL("anvil://tool/json-to-code");
}
