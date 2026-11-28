import { recognizeScreenArea } from "swift:../swift";
import { OCRResult, hideRaycast, ocrOptions, run } from "./lib/run";

export default async function Command() {
  await hideRaycast();
  await run(() => recognizeScreenArea(ocrOptions()) as Promise<OCRResult>);
}
