import { LaunchProps, showHUD } from "@raycast/api";
import { YASB } from "./executor";

// Due to raycast limitations, we cannot have dynamic arguments for commands.
// Ideally, we dynamically fetch the list of available screens and let the user choose.
export default async function ToggleWidget(props: LaunchProps<{ arguments: Arguments.ToggleWidget }>) {
  try {
    const { widget, screen } = props.arguments;
    const args = screen ? ["--screen", `"${screen}"`] : [];

    if (!widget) {
      await showHUD("Please provide a widget name");
      return;
    }

    args.push(`"${widget}"`);

    await YASB.executeCommand(YASB.SHOW_BAR_COMMAND, args);
    await showHUD("YASB widget toggled.");
  } catch (error) {
    console.error("Error toggling YASB widget:", error);
    await showHUD("Failed to toggle YASB widget.");
    return;
  }
}
