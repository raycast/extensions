import { launchAnvilURL } from "./launch-anvil";

export default async function OpenBase64Command() {
  await launchAnvilURL("anvil://tool/base64");
}
