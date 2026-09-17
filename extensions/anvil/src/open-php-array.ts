import { launchAnvilURL } from "./launch-anvil";

export default async function OpenPhpArrayCommand() {
  await launchAnvilURL("anvil://tool/php-array");
}
