import { launchAnvilURL } from "./launch-anvil";

export default async function OpenRegexpCommand() {
  await launchAnvilURL("anvil://tool/regexp");
}
