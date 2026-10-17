import { launchAnvilURL } from "./launch-anvil";

export default async function OpenLessBeautifyCommand() {
  await launchAnvilURL("anvil://tool/less-beautify");
}
