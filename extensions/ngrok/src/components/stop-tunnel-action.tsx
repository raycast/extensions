import { Action, Alert, Color, Icon, Toast, confirmAlert, showToast } from "@raycast/api";

import { stopTunnel } from "../api";

type Props = {
  tunnelName: string;
  tunnelUrl: string;
  revalidateTunelSessions: () => void;
};

const options: Alert.Options = {
  title: "Do you want to stop this tunnel?",
  primaryAction: {
    title: "Confirm",
    style: Alert.ActionStyle.Destructive,
  },
  icon: { source: Icon.Pause, tintColor: Color.Red },
};

export default function StopTunnelAction({ tunnelName, tunnelUrl, revalidateTunelSessions }: Props) {
  const handleStopTunnel = async () => {
    const isConfirmed = await confirmAlert(options);

    if (!isConfirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Stopping Tunnel ${tunnelUrl}...`,
    });

    try {
      await stopTunnel(tunnelName);

      toast.style = Toast.Style.Success;
      toast.title = "Tunnel stopped!";
    } catch (err) {
      console.error(err);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to stop tunnel";
      if (err instanceof Error) {
        toast.message = err.message;
      }
    }

    revalidateTunelSessions();
  };

  return (
    <Action
      icon={Icon.Stop}
      title="Stop Tunnel"
      shortcut={{ modifiers: ["cmd"], key: "s" }}
      onAction={handleStopTunnel}
      style={Action.Style.Destructive}
    />
  );
}
