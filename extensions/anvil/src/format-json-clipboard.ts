import { launchAnvilURL } from "./launch-anvil";

export default async function FormatJsonClipboardCommand() {
  await launchAnvilURL("anvil://command/clipboard.format-json.copy");
}
