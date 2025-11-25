import { LaunchProps, showToast, Toast } from "@raycast/api";
import { MonitorControl } from "./utils/monitor-control";

type Arguments = {
  level: string;
};

export default async function SetContrast(props: LaunchProps<{ arguments: Arguments }>) {
  const hasSupport = await MonitorControl.checkDDCSupport();
  if (!hasSupport) return;

  const { level } = props.arguments;

  if (!level || !level.trim()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid Input",
      message: "Please provide a contrast level (0-100)",
    });
    return;
  }

  const targetContrast = parseInt(level.trim());

  if (isNaN(targetContrast)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid Number",
      message: "Please provide a valid number between 0-100",
    });
    return;
  }

  if (targetContrast < 0 || targetContrast > 100) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Out of Range",
      message: "Contrast level must be between 0-100",
    });
    return;
  }

  await MonitorControl.setContrast(targetContrast);
}
