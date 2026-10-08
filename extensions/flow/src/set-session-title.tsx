import { showHUD, LaunchProps } from "@raycast/api";
import { isFlowInstalled, setSessionTitle } from "./utils";

export default async function SetSessionTitleCommand(props: LaunchProps<{ arguments: { title?: string } }>) {
  if (!(await isFlowInstalled())) {
    await showHUD("Flow not installed. Install it from: https://flowapp.info/download");
    return;
  }

  const title = props.arguments.title || "";

  try {
    await setSessionTitle(title);
    await showHUD(title ? `Session title set to: ${title}` : "Session title was reset to default.");
  } catch (error) {
    await showHUD(`Failed to set title: ${error instanceof Error ? error.message : String(error)}`);
  }
}
