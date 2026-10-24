import { launchAnvilURL } from "./launch-anvil";

export default async function OpenLineSortDedupeCommand() {
  await launchAnvilURL("anvil://tool/line-sort-dedupe");
}
