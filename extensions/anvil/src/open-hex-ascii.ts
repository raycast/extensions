import { launchAnvilURL } from "./launch-anvil";

export default async function OpenHexAsciiCommand() {
  await launchAnvilURL("anvil://tool/hex-ascii");
}
