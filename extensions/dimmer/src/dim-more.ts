import { showHUD } from "@raycast/api";
import { describeHUD, dimMore } from "./state";

export default async function Command() {
  const state = await dimMore();
  await showHUD(describeHUD(state));
}
