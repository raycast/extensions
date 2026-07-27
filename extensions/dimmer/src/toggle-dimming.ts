import { showHUD } from "@raycast/api";
import { describeHUD, toggleDim } from "./state";

export default async function Command() {
  const state = await toggleDim();
  await showHUD(describeHUD(state));
}
