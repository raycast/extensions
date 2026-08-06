import { launchAnvilURL } from "./launch-anvil";

export default async function OpenUuidCommand() {
  await launchAnvilURL("anvil://tool/uuid");
}
