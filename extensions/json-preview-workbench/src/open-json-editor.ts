import { closeMainWindow, LaunchProps, showToast, Toast } from "@raycast/api";
import { initialInput, launchEditor } from "./lib/launch-editor";

export default async function Command(props: LaunchProps<{ arguments: { input?: string } }>) {
  try {
    const text = await initialInput(props.arguments.input);
    await launchEditor(text);
    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Open JSON Editor",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
