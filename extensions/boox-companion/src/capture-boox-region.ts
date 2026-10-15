import { showHUD } from "@raycast/api";
import { runBooxLens } from "./lib/boox-lens";
import { describeBooxError } from "./lib/errors";

export default async function CaptureBooxRegion() {
  try {
    const result = await runBooxLens("crop");
    if (result.status === "cancelled") return;
    const verb = result.status === "saved" ? "Saved" : "Copied";
    await showHUD(`${verb} BOOX Region${result.width && result.height ? ` · ${result.width} × ${result.height}` : ""}`);
  } catch (error) {
    await showHUD(describeBooxError(error));
  }
}
