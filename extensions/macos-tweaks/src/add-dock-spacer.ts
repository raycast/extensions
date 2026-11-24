import { LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { addDockSpacer } from "./utils/dock-spacers";
import type { DockSide, SpacerSize } from "./utils/dock-spacers";

export default async function AddDockSpacer({ arguments: args }: LaunchProps<{ arguments: Arguments.AddDockSpacer }>) {
  // Both arguments are optional: a bare launch adds a small spacer among the apps
  const size: SpacerSize = args.size === "regular" ? "regular" : "small";
  const side: DockSide = args.side === "documents" ? "documents" : "apps";

  try {
    addDockSpacer(size, side);
    const where = side === "apps" ? "after your apps" : "after your folders";
    await showHUD(`${size === "small" ? "Small spacer" : "Spacer"} added ${where} — drag it into place`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to add the spacer",
      message: error instanceof Error ? error.message : undefined,
    });
  }
}
