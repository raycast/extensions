import { launchAnvilURL } from "./launch-anvil";

export default async function OpenMarkdownpreviewCommand() {
  await launchAnvilURL("anvil://tool/markdownPreview");
}
