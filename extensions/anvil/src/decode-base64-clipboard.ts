import { launchAnvilURL } from "./launch-anvil";

export default async function DecodeBase64ClipboardCommand() {
  await launchAnvilURL("anvil://command/clipboard.decode-base64.copy");
}
