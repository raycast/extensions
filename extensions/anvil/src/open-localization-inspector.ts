import { launchAnvilURL } from "./launch-anvil";

export default async function OpenLocalizationInspectorCommand() {
  await launchAnvilURL("anvil://tool/localization-inspector");
}
