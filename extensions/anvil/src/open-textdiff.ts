import { launchAnvilURL } from "./launch-anvil";

export default async function OpenTextdiffCommand() {
  await launchAnvilURL("anvil://tool/textDiff");
}
