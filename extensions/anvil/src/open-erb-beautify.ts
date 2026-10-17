import { launchAnvilURL } from "./launch-anvil";

export default async function OpenErbBeautifyCommand() {
  await launchAnvilURL("anvil://tool/erb-beautify");
}
