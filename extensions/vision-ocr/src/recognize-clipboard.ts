import { recognizeClipboard } from "swift:../swift";
import { OCRResult, hideRaycast, ocrOptions, run } from "./lib/run";

export default async function Command() {
  await hideRaycast();
  await run(() => recognizeClipboard(ocrOptions()) as Promise<OCRResult>);
}
