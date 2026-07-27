import { showHUD } from "@raycast/api";
import { describeHUD, resetDim } from "./state";

export default async function Command() {
  const state = await resetDim();
  await showHUD(describeHUD(state));
}
