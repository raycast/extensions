import { launchAnvilURL } from "./launch-anvil";

export default async function OpenHtmltojsxCommand() {
  await launchAnvilURL("anvil://tool/htmlToJSX");
}
