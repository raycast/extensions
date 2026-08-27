import { triggerCapsoAction } from "./utils";
export default async function Command() {
  await triggerCapsoAction("captureAreaToClipboard", 26, "Capture Area to Clipboard");
}
