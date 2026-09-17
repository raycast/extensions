import { showFailureToast } from "@raycast/utils";
import { openNewCodexThread } from "./utils/launch";

export default async function Command() {
  try {
    await openNewCodexThread();
  } catch (error) {
    await showFailureToast(error, { title: "Unable to start Codex thread" });
  }
}
