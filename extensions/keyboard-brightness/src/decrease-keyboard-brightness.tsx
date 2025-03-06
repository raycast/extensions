import { launchCommand, LaunchType } from "@raycast/api";
import { adjustBrightness, getSystemBrightness } from "./utils";

export default async function command() {
  const brightness = await getSystemBrightness();
  await adjustBrightness(brightness!, "decrease");

  try {
    await launchCommand({
      name: "menubar-keyboard-brightness",
      type: LaunchType.Background,
    });
  } catch {
    () => {};
  }
}
