import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { identify } from "./lib/nanoleaf-client";

export default async function Command() {
  try {
    await identify();
    await showHUD("Identifying device");
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't identify device" });
  }
}
