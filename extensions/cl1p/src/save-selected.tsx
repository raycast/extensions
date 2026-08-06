import { getSelectedText, LaunchProps, showToast, Toast } from "@raycast/api";
import { saveWithFeedback } from "./lib/save-with-feedback";

export default async function Command(
  props: LaunchProps<{ arguments: Arguments.SaveSelected }>,
) {
  const { title } = props.arguments;

  let content: string;
  try {
    content = await getSelectedText();
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "No text selected",
      message: "Select text in another app before running this command",
    });
    return;
  }

  if (!content.trim()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No text selected",
      message: "Select text in another app before running this command",
    });
    return;
  }

  await saveWithFeedback(title, content);
}
