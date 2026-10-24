import { launchAnvilURL } from "./launch-anvil";

export default async function OpenTimestampCommand() {
  await launchAnvilURL("anvil://tool/timestamp");
}
