import { Clipboard, LaunchProps, Toast, showToast } from "@raycast/api";
import {
  DaemonNotRunningError,
  INSTALL_DAEMON_COMMAND,
  getFanSnapshot,
  setFanSpeed,
} from "./lib/smctl";

type CommandProps = LaunchProps<{ arguments: { rpm: string } }>;

export default async function Command(props: CommandProps): Promise<void> {
  const rpm = Number(props.arguments.rpm);
  if (!Number.isInteger(rpm) || rpm < 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "RPM must be a whole number",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Setting fans to ${rpm} RPM…`,
  });
  try {
    const snapshot = await getFanSnapshot();
    const min = Math.min(...snapshot.fans.map((fan) => fan.minimumRPM));
    const max = Math.max(...snapshot.fans.map((fan) => fan.maximumRPM));
    if (snapshot.fans.length > 0 && (rpm < min || rpm > max)) {
      toast.style = Toast.Style.Failure;
      toast.title = `RPM out of range (${min}–${max})`;
      return;
    }
    await setFanSpeed(rpm);
    toast.style = Toast.Style.Success;
    toast.title = `Fans set to ${rpm} RPM`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to set fan speed";
    toast.message = error instanceof Error ? error.message : String(error);
    if (error instanceof DaemonNotRunningError) {
      toast.primaryAction = {
        title: "Copy Install Command",
        onAction: () => Clipboard.copy(INSTALL_DAEMON_COMMAND),
      };
    }
  }
}
