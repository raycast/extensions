import { showHUD } from "@raycast/api";
import { describeHUD, dimLess } from "./state";

export default async function Command() {
  const state = await dimLess();
  await showHUD(describeHUD(state));
}
