import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { describeHUD, dimMore } from "./state";

export default async function Command() {
  try {
    const state = await dimMore();
    await showHUD(describeHUD(state));
  } catch (error) {
    await showFailureToast(error, { title: "Could not dim the displays more" });
  }
}
