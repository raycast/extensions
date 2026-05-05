import { captureFromClipboard } from "./lib/capture";

export default async function Command() {
  await captureFromClipboard();
}
