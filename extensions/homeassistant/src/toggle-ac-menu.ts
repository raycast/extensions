import { acMenuCache } from "@lib/ac-menu";
import { getErrorMessage } from "@lib/utils";
import { launchCommand, LaunchType, showHUD } from "@raycast/api";

export default async function ToggleACMenu() {
  const wasVisible = acMenuCache.get("visible") === "true";
  acMenuCache.set("visible", String(!wasVisible));
  try {
    await launchCommand({ name: "acmenu", type: LaunchType.Background });
    await showHUD(wasVisible ? "AC menu hidden" : "AC menu shown");
  } catch (error) {
    acMenuCache.set("visible", String(wasVisible));
    await showHUD(`Could not toggle AC menu: ${getErrorMessage(error)}`);
  }
}
