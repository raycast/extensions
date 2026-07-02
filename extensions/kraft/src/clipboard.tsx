import { Clipboard, launchCommand, LaunchProps, LaunchType, showHUD } from "@raycast/api";

/* eslint-disable @typescript-eslint/no-unused-vars */
export default async function Command(props: LaunchProps) {
  const text = await Clipboard.readText();

  if (!text?.trim()) {
    await showHUD("No clipboard text found");
    return;
  }

  await launchCommand({
    name: "kraft",
    type: LaunchType.UserInitiated,
    context: {
      inputPicker: true,
      source: "clipboard",
      sourceTitle: "Clipboard Text",
      txt: text,
    },
  });
}
