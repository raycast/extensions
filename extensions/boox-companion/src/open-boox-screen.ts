import { showHUD } from "@raycast/api";
import { runBooxLens } from "./lib/boox-lens";
import { describeBooxError } from "./lib/errors";

export default async function OpenBooxScreen() {
  try {
    await runBooxLens("view");
    await showHUD("Opened BOOX Screen");
  } catch (error) {
    await showHUD(describeBooxError(error));
  }
}
