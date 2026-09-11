import { launchAnvilURL } from "./launch-anvil";

export default async function OpenScssBeautifyCommand() {
  await launchAnvilURL("anvil://tool/scss-beautify");
}
