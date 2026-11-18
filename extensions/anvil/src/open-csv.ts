import { launchAnvilURL } from "./launch-anvil";

export default async function OpenCsvCommand() {
  await launchAnvilURL("anvil://tool/csv");
}
