import { launchAnvilURL } from "./launch-anvil";

export default async function OpenCssBeautifyCommand() {
  await launchAnvilURL("anvil://tool/css-beautify");
}
