import {
  getSelectedText,
  showToast,
  Toast,
  launchCommand,
  LaunchType,
} from "@raycast/api";

export default async function Command() {
  try {
    const text = await getSelectedText();
    if (!text.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Text Selected",
      });
      return;
    }
    await launchCommand({
      name: "chat",
      type: LaunchType.UserInitiated,
      context: { prefillText: text },
    });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Text Selected",
      message: "Select some text in any app first",
    });
  }
}
