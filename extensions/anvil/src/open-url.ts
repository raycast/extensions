import { launchAnvilURL } from "./launch-anvil";

export default async function OpenUrlCommand() {
  await launchAnvilURL("anvil://tool/url");
}
