import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { disable } from "./lib/session";

export default async function Command() {
  try {
    await disable();
    await showHUD("Lid Awake off, your Mac can sleep normally");
  } catch (error) {
    await showFailureToast(error, { title: "Could not turn off Lid Awake" });
  }
}
