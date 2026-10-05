import { launchAnvilURL } from "./launch-anvil";

export default async function OpenHtmlBeautifyCommand() {
  await launchAnvilURL("anvil://tool/html-beautify");
}
