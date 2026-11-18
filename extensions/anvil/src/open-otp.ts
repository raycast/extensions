import { launchAnvilURL } from "./launch-anvil";

export default async function OpenOtpCommand() {
  await launchAnvilURL("anvil://tool/otp");
}
