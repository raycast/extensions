import { launchAnvilURL } from "./launch-anvil";

export default async function OpenColorConverterCommand() {
  await launchAnvilURL("anvil://tool/color-converter");
}
