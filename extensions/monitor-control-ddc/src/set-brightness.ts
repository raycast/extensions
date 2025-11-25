import { LaunchProps, showToast, Toast } from "@raycast/api";
import { MonitorControl } from "./utils/monitor-control";

type Arguments = {
  level: string;
};

export default async function SetBrightness(props: LaunchProps<{ arguments: Arguments }>) {
  const hasSupport = await MonitorControl.checkDDCSupport();
  if (!hasSupport) return;

  const { level } = props.arguments;

  if (!level || !level.trim()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid Input",
      message: "Please provide a brightness level (0-100)",
    });
    return;
  }

  const targetBrightness = parseInt(level.trim());

  if (isNaN(targetBrightness)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid Number",
      message: "Please provide a valid number between 0-100",
    });
    return;
  }

  if (targetBrightness < 0 || targetBrightness > 100) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Out of Range",
      message: "Brightness level must be between 0-100",
    });
    return;
  }

  await MonitorControl.setBrightness(targetBrightness);
}
