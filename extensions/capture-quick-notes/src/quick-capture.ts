import { closeMainWindow, LaunchProps, showHUD } from "@raycast/api";
import { addCapture, errorMessage } from "./capture-cli";

export default async function Command(
  props: LaunchProps<{ arguments: Arguments.QuickCapture }>,
) {
  const content = props.arguments.content || props.fallbackText || "";
  const list = props.arguments.list || undefined;

  await closeMainWindow({ clearRootSearch: true });
  try {
    const capture = await addCapture(content, list);
    await showHUD(
      capture.listName ? `Captured to ${capture.listName}` : "Captured",
    );
  } catch (error) {
    await showHUD(`Could not capture: ${errorMessage(error)}`);
  }
}
