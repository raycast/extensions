import { launchAnvilURL } from "./launch-anvil";

export default async function OpenHtmlpreviewCommand() {
  await launchAnvilURL("anvil://tool/htmlPreview");
}
