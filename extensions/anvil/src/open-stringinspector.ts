import { launchAnvilURL } from "./launch-anvil";

export default async function OpenStringinspectorCommand() {
  await launchAnvilURL("anvil://tool/stringInspector");
}
