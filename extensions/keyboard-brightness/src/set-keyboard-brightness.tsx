import {
  closeMainWindow,
  launchCommand,
  LaunchProps,
  LaunchType,
  showToast,
  Toast,
} from "@raycast/api";
import { getSystemBrightness, setStoredBrightness, setSystemBrightness } from "./utils";

export default async function command(
  props: LaunchProps<{ arguments: Arguments.SetKeyboardBrightness }>,
) {
  const input = props.arguments.percentage.trim();
  const percentage = Number(input);

  if (
    input === "" ||
    !Number.isInteger(percentage) ||
    percentage < 0 ||
    percentage > 100
  ) {
    showToast({
      style: Toast.Style.Failure,
      title: "Enter a number between 0 and 100",
    });
    return;
  }
  await closeMainWindow();

  if (percentage === 0) {
    const currentBrightness = await getSystemBrightness();
    if (currentBrightness !== undefined && currentBrightness > 0) {
      await setStoredBrightness(currentBrightness);
    }
  }

  const newBrightness = await setSystemBrightness(percentage / 100);

  if (newBrightness === undefined) {
    return;
  }

  showToast({
    style: Toast.Style.Success,
    title: `Keyboard Brightness set to ${percentage}%`,
  });

  try {
    await launchCommand({
      name: "menubar-keyboard-brightness",
      type: LaunchType.Background,
    });
  } catch {
    // menu bar command isn't enabled, ignore
  }
}
