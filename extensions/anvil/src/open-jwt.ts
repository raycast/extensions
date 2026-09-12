import { launchAnvilURL } from "./launch-anvil";

export default async function OpenJwtCommand() {
  await launchAnvilURL("anvil://tool/jwt");
}
