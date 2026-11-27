import { showFailureToast } from "@raycast/utils";
import { refreshMenuBar, runToggle } from "./lib/stage";

export default async function Command() {
  try {
    const outcome = await runToggle({ closeRaycast: true });
    if (outcome.error) await showFailureToast(outcome.error, { title: "Focus Stage didn't start" });
  } catch (error) {
    await showFailureToast(error, { title: "Focus Stage failed" });
  }
  await refreshMenuBar();
}
