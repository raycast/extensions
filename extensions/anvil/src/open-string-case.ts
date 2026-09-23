import { launchAnvilURL } from "./launch-anvil";

export default async function OpenStringCaseCommand() {
  await launchAnvilURL("anvil://tool/string-case");
}
