import { launchAnvilURL } from "./launch-anvil";

export default async function OpenHtmlentityCommand() {
  await launchAnvilURL("anvil://tool/htmlentity");
}
