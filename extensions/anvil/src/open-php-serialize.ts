import { launchAnvilURL } from "./launch-anvil";

export default async function OpenPhpSerializeCommand() {
  await launchAnvilURL("anvil://tool/php-serialize");
}
