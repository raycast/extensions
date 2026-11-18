import { launchAnvilURL } from "./launch-anvil";

export default async function OpenJsBeautifyCommand() {
  await launchAnvilURL("anvil://tool/js-beautify");
}
