import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showHUD, showToast, Toast } from "@raycast/api";
import { status, unpatchFinicky } from "./lib/config";
import { restartFinicky } from "./lib/finicky-app";

export default function Unpatch() {
  const { patched, rules } = status();

  if (!patched) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="Nothing to unpatch"
          description="~/.finicky.js is not linked to ~/.finickizer.js"
        />
      </List>
    );
  }

  const rulesLabel = `${rules} remembered rule${rules === 1 ? "" : "s"}`;
  return (
    <List navigationTitle="Unpatch Finicky Config" searchBarPlaceholder="Put your own config back in charge">
      <List.Section title="Your own config takes over again and Finicky restarts" subtitle={rulesLabel}>
        <List.Item
          icon={Icon.Eject}
          title="Unpatch, keep ~/.finickizer.js"
          subtitle="Inactive, but a later Patch picks the rules up again"
          actions={
            <ActionPanel>
              <Action title="Unpatch Config" icon={Icon.Eject} onAction={() => unpatch(false)} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Trash}
          title="Unpatch and delete ~/.finickizer.js"
          subtitle={`Deletes the ${rulesLabel} with it`}
          actions={
            <ActionPanel>
              <Action
                title="Unpatch Config and Delete Rules"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => unpatch(true)}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

async function unpatch(deleteEntry: boolean): Promise<void> {
  if (deleteEntry) {
    const confirmed = await confirmAlert({
      title: "Delete ~/.finickizer.js?",
      message: "All remembered rules are in that file and will be gone.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
  }
  try {
    const outcome = unpatchFinicky({ deleteEntry });
    if (outcome.restartFinicky) await restartFinicky();
    await showHUD(`Finicky config unpatched: ${[...outcome.changes, "restarted Finicky"].join(", ")}`);
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Could not unpatch Finicky config", message: String(error) });
  }
}
