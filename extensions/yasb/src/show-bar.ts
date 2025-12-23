import { LaunchProps, showHUD } from "@raycast/api";
import { YASB } from "./executor";

// Due to raycast limitations, we cannot have dynamic arguments for commands.
// Ideally, we dynamically fetch the list of available screens and let the user choose.
export default async function ShowBar(props: LaunchProps<{ arguments: Arguments.ShowBar }>) {
  try {
    const { screen } = props.arguments;
    const args = screen ? ["--screen", `"${screen}"`] : [];

    await YASB.executeCommand(YASB.SHOW_BAR_COMMAND, args);
    await showHUD("YASB bar shown.");
  } catch (error) {
    console.error("Error showing YASB bar:", error);
    await showHUD("Failed to show YASB bar");
    return;
  }
}
