import { getSelectedText, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";

export default async function Command() {
  try {
    const term = await getSelectedText();
    await launchCommand({
      name: "translate",
      type: LaunchType.UserInitiated,
      context: { term: term.trim().toLowerCase() },
    });
  } catch (error) {
    console.error(error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Unable to get selected text",
    });
  }
}
