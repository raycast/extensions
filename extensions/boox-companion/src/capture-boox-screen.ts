import { showHUD } from "@raycast/api";
import { runBooxLens } from "./lib/boox-lens";
import { describeBooxError } from "./lib/errors";

export default async function CaptureBooxScreen() {
  try {
    const result = await runBooxLens("capture");
    await showHUD(`Copied BOOX Screen${result.width && result.height ? ` · ${result.width} × ${result.height}` : ""}`);
  } catch (error) {
    await showHUD(describeBooxError(error));
  }
}
