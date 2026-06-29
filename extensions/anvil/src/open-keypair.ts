import { launchAnvilURL } from "./launch-anvil";

export default async function OpenKeypairCommand() {
  await launchAnvilURL("anvil://tool/keypair");
}
