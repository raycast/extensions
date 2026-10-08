import { launchAnvilURL } from "./launch-anvil";

export default async function OpenXmlBeautifyCommand() {
  await launchAnvilURL("anvil://tool/xml-beautify");
}
