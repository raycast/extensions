import { Action, ActionPanel, Alert, Color, Icon, List, confirmAlert, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Requirements } from "./components/Requirements";
import { useRequirements } from "./hooks/useRequirements";
import { useStatus } from "./hooks/useStatus";
import { runpool } from "./lib/runpool";

export default function Command() {
  const { status, isLoading, revalidate } = useStatus({ local: true });
  const { missing, recheck } = useRequirements();

  if (missing) return <Requirements missing={missing} onRecheck={recheck} />;

  const paused = status?.paused ?? false;

  async function togglePause() {
    if (!paused) {
      const confirmed = await confirmAlert({
        title: "Pause Runner Pools?",
        message:
          "Every RunPool runner stands down and stops waking for queued work. This does not affect Blacksmith or GitHub workflows.",
        primaryAction: { title: "Pause Runner Pools", style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: paused ? "Resuming Runner Pools…" : "Pausing Runner Pools…",
    });
    try {
      await runpool([paused ? "resume" : "pause"]);
      toast.style = Toast.Style.Success;
      toast.title = paused ? "Runner pools resume on demand" : "Runner pools paused";
      revalidate();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, {
        title: paused ? "Could Not Resume Runner Pools" : "Could Not Pause Runner Pools",
      });
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle="Manage Runner Pools">
      <List.Item
        icon={paused ? Icon.Pause : Icon.Play}
        title="Automatic Runner Pools"
        subtitle={paused ? "Paused, runners stay down" : "Enabled, pools wake for queued work"}
        accessories={[{ tag: { value: paused ? "Paused" : "Enabled", color: paused ? Color.Orange : Color.Green } }]}
        actions={
          <ActionPanel>
            <Action
              title={paused ? "Resume Runner Pools" : "Pause Runner Pools"}
              icon={paused ? Icon.Play : Icon.Pause}
              style={paused ? Action.Style.Regular : Action.Style.Destructive}
              onAction={togglePause}
            />
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
          </ActionPanel>
        }
      />
    </List>
  );
}
