import { LaunchProps, showHUD } from "@raycast/api";
import { YASB } from "./executor";

// Due to raycast limitations, we cannot have dynamic arguments for commands.
// Ideally, we dynamically fetch the list of available screens and let the user choose.
export default async function HideBar(props: LaunchProps<{ arguments: Arguments.HideBar }>) {
  try {
    const { screen } = props.arguments;
    const args = screen ? ["--screen", `"${screen}"`] : [];

    await YASB.executeCommand(YASB.HIDE_BAR_COMMAND, args);
    await showHUD("YASB bar hidden.");
  } catch (error) {
    console.error("Error hiding YASB bar:", error);
    await showHUD("Failed to hide YASB bar");
    return;
  }
}
