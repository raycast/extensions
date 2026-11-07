import { Action, ActionPanel, Alert, Detail, Icon, confirmAlert, showToast, Toast } from "@raycast/api";
import { resetStore, restoreBackup, StoreCorruptedError } from "../prompts/store";
import { guarded } from "./feedback";

interface StoreRecoveryProps {
  error: Error;
  onRecovered: () => void;
}

/** Stored data is never replaced silently. The user decides, and the unreadable data stays quarantined in storage. */
export function StoreRecovery({ error, onRecovered }: StoreRecoveryProps) {
  const hasBackup = error instanceof StoreCorruptedError && error.hasBackup;

  const restore = guarded("Cannot Restore Backup", async () => {
    await restoreBackup();
    await showToast({ style: Toast.Style.Success, title: "Backup Restored" });
    onRecovered();
  });

  const reset = guarded("Cannot Reset Data", async () => {
    const confirmed = await confirmAlert({
      title: "Start With Empty Data?",
      message: "All prompts and settings are replaced by the defaults.",
      primaryAction: { title: "Reset Data", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await resetStore();
    onRecovered();
  });

  return (
    <Detail
      markdown={`# Stored Data Could Not Be Read\n\n${error.message}`}
      actions={
        <ActionPanel>
          {hasBackup && <Action title="Restore Backup" icon={Icon.ArrowCounterClockwise} onAction={restore} />}
          <Action title="Reset Data" icon={Icon.Eraser} style={Action.Style.Destructive} onAction={reset} />
        </ActionPanel>
      }
    />
  );
}
