import { launchAnvilURL } from "./launch-anvil";

export default async function OpenQrcodeCommand() {
  await launchAnvilURL("anvil://tool/qrCode");
}
