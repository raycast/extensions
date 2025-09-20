import { Action, Alert, Color, Icon, Toast, confirmAlert, showToast } from "@raycast/api";

import { stopTunnelAgent } from "../api";

type Props = {
  tunnelSessionId: string;
  revalidateTunelSessions: () => void;
};

const options: Alert.Options = {
  title: "Do you want to stop this agent session?",
  message: "All the tunnels associated with this session will be stopped.",
  primaryAction: {
    title: "Confirm",
    style: Alert.ActionStyle.Destructive,
  },
  icon: { source: Icon.XMarkCircleFilled, tintColor: Color.Red },
};

export default function StopAgentAction({ tunnelSessionId, revalidateTunelSessions }: Props) {
  const handleStopAgent = async () => {
    const isConfirmed = await confirmAlert(options);

    if (!isConfirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Stopping Agent ${tunnelSessionId}...`,
    });

    try {
      await stopTunnelAgent(tunnelSessionId);

      toast.style = Toast.Style.Success;
      toast.title = "Agent stopped!";
    } catch (err) {
      console.error(err);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to stop agent";
      if (err instanceof Error) {
        toast.message = err.message;
      }
    }

    revalidateTunelSessions();
  };

  return (
    <Action
      icon={Icon.XMarkCircle}
      title="Stop Session"
      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      onAction={handleStopAgent}
      style={Action.Style.Destructive}
    />
  );
}
