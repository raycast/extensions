import { LaunchProps, showHUD } from "@raycast/api";
import { YASB } from "./executor";

// Due to raycast limitations, we cannot have dynamic arguments for commands.
// Ideally, we dynamically fetch the list of available screens and let the user choose.
export default async function ToggleBar(props: LaunchProps<{ arguments: Arguments.ToggleBar }>) {
  try {
    const { screen } = props.arguments;
    const args = screen ? ["--screen", `"${screen}"`] : [];

    await YASB.executeCommand(YASB.TOGGLE_BAR_COMMAND, args);
    await showHUD("YASB bar toggled.");
  } catch (error) {
    console.error("Error toggling YASB bar:", error);
    await showHUD("Failed to toggle YASB bar");
    return;
  }
}
