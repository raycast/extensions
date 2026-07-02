import { getSelectedText, launchCommand, LaunchProps, LaunchType, showHUD } from "@raycast/api";

/* eslint-disable @typescript-eslint/no-unused-vars */
export default async function Command(props: LaunchProps) {
  let text = "";
  try {
    text = await getSelectedText();
  } catch {
    await showHUD("No selected text found");
    return;
  }

  if (!text.trim()) {
    await showHUD("No selected text found");
    return;
  }

  await launchCommand({
    name: "kraft",
    type: LaunchType.UserInitiated,
    context: {
      inputPicker: true,
      source: "selected",
      sourceTitle: "Selected Text",
      txt: text,
    },
  });
}
