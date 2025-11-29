import {
  Action,
  ActionPanel,
  Grid,
  Icon,
  Toast,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { ClockStatus, formatDuration } from "./bamboo/api";
import { Preferences } from "./preferences";
import { createClient, formatEntryLine } from "./helpers";

export default function Command() {
  const [status, setStatus] = useState<ClockStatus>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void refreshStatus();
  }, []);

  async function refreshStatus() {
    setIsLoading(true);
    try {
      const preferences = getPreferenceValues<Preferences>();
      const client = createClient(preferences);
      const result = await client.getTodayStatus();
      setStatus(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      await showToast(Toast.Style.Failure, "Failed to load status", message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Grid isLoading={isLoading} searchBarPlaceholder="Status overview">
      <Grid.EmptyView
        title={buildTitle(status)}
        description={buildDescription(status)}
        icon={status?.status === "clocked_in" ? Icon.CheckCircle : Icon.Clock}
        actions={
          <ActionPanel>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={() => void refreshStatus()}
            />
          </ActionPanel>
        }
      />
    </Grid>
  );
}

function buildTitle(status?: ClockStatus): string {
  if (!status) {
    return "Checking status...";
  }
  return status.status === "clocked_in" ? "Clocked In" : "Clocked Out";
}

function buildDescription(status: ClockStatus | undefined): string {
  if (!status) {
    return "Refresh to load your current BambooHR clock status.";
  }

  const lines: string[] = [];

  if (status.status === "clocked_in" && status.runningEntry) {
    lines.push(formatEntryLine(status.runningEntry, "Running"));
  } else if (status.lastEntry) {
    lines.push(formatEntryLine(status.lastEntry, "Last"));
  } else {
    lines.push("No time tracked today.");
  }

  lines.push(`Tracked today: ${formatDuration(status.todayTotalMs)}`);

  return lines.join("\n");
}
