import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { setAutomatic } from "macos-fan-control-client";
import { needsSetup } from "./install";
import { openCommand } from "./launch";

export default async function Command() {
  try {
    await setAutomatic();
    await showHUD("Fans on automatic");
  } catch (error) {
    await showFailureToast(error, {
      title: "Failed",
      primaryAction:
        error instanceof Error && needsSetup(error)
          ? {
              title: "Set Up Fan Control",
              onAction: () =>
                openCommand(
                  "fan-control-setup",
                  "Could not open Set Up Fan Control",
                ),
            }
          : undefined,
    });
  }
}
