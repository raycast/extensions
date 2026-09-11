import { launchAnvilURL } from "./launch-anvil";

export default async function OpenLogFormatterCommand() {
  await launchAnvilURL("anvil://tool/log-formatter");
}
