import { launchAnvilURL } from "./launch-anvil";

export default async function OpenLoremipsumCommand() {
  await launchAnvilURL("anvil://tool/loremIpsum");
}
