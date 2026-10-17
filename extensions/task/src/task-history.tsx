import { Action, ActionPanel, Detail, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { endReasonLabel, formatWorkingTime, readHistory, type HistoryEntry } from "./history";

function timestamp(time: number): string {
  return new Date(time).toLocaleString();
}

function EntryDetails({ entry }: { entry: HistoryEntry }) {
  return (
    <Detail
      navigationTitle="Task Session"
      markdown={`# Task Session\n\nThis session ended ${entry.endReason === "manual" ? "manually" : "when its time limit was reached"}.`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Task" text={entry.taskName} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Started" text={timestamp(entry.startedAt)} />
          <Detail.Metadata.Label title="Ended" text={timestamp(entry.endedAt)} />
          <Detail.Metadata.Label title="Time Limit" text={`${entry.durationMinutes} min`} />
          <Detail.Metadata.Label title="Working Time" text={formatWorkingTime(entry.actualWorkMs)} />
          <Detail.Metadata.Label title="End Reason" text={endReasonLabel(entry)} />
        </Detail.Metadata>
      }
    />
  );
}

export default function Command() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await readHistory());
      setError(undefined);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      setError(message);
      await showToast({ style: Toast.Style.Failure, title: "Could not load task history", message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const refreshAction = (
    <Action
      title="Refresh History"
      icon={Icon.ArrowClockwise}
      onAction={refresh}
      shortcut={Keyboard.Shortcut.Common.Refresh}
    />
  );
  return (
    <List isLoading={loading} searchBarPlaceholder="Search task history" navigationTitle="Task History">
      <List.EmptyView
        icon={error ? Icon.Warning : Icon.Clock}
        title={error ? "Could Not Load History" : "No Task History Yet"}
        description={error ?? "Completed and manually ended tasks will appear here."}
        actions={<ActionPanel>{refreshAction}</ActionPanel>}
      />
      <List.Section title="Finished Sessions" subtitle={`${entries.length} sessions`}>
        {entries.map((entry) => (
          <List.Item
            key={entry.id}
            title={entry.taskName}
            subtitle={`${formatWorkingTime(entry.actualWorkMs)} worked / ${entry.durationMinutes} min limit`}
            icon={entry.endReason === "time-limit" ? Icon.CheckCircle : Icon.Stop}
            keywords={[endReasonLabel(entry), timestamp(entry.startedAt)]}
            accessories={[
              { text: endReasonLabel(entry) },
              { date: new Date(entry.endedAt), tooltip: timestamp(entry.endedAt) },
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="Show Session Details" icon={Icon.List} target={<EntryDetails entry={entry} />} />
                {refreshAction}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
