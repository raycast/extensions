import { launchAnvilURL } from "./launch-anvil";

export default async function OpenCurlToCodeCommand() {
  await launchAnvilURL("anvil://tool/curl-to-code");
}
