import {
  ActionPanel,
  Action,
  Icon,
  confirmAlert,
  showToast,
  Toast,
  openExtensionPreferences,
  Keyboard,
} from "@raycast/api";
import type { LaunchJob } from "../lib/types";
import { runService } from "../lib/data/run-service";
import { JobFullDetail } from "./JobFullDetail";
import { ScheduleEditorForm } from "./ScheduleEditorForm";
import { LogDetailView } from "./LogDetailView";
import { LiveTailView } from "./LiveTailView";

interface JobActionPanelProps {
  job: LaunchJob;
  onToggleAppleServices?: () => void;
  onRefresh?: () => void;
  showAppleServices?: boolean;
}

export function JobActionPanel({
  job,
  onToggleAppleServices,
  onRefresh,
  showAppleServices,
}: JobActionPanelProps) {
  async function handleRunJob() {
    const confirmed = await confirmAlert({
      title: `Run ${job.label}?`,
      message: "This will trigger the job immediately via launchctl kickstart.",
      primaryAction: { title: "Run" },
    });

    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Running job...",
    });
    try {
      await runService(job.label);
      toast.style = Toast.Style.Success;
      toast.title = "Job triggered";
      toast.message = job.label;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to run job";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.Push
          title="View Full Detail"
          icon={Icon.Eye}
          target={<JobFullDetail job={job} onRefresh={onRefresh} />}
        />
        <Action
          title="Run Job Now"
          icon={Icon.Play}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={handleRunJob}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        {job.source === "user" && (
          <Action.Push
            title="Edit Schedule"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            target={<ScheduleEditorForm job={job} onRefresh={onRefresh} />}
          />
        )}
        <Action.Push
          title="View Logs"
          icon={Icon.Document}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          target={<LogDetailView job={job} />}
        />
        <Action.Push
          title="Live Tail"
          icon={Icon.Terminal}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          target={<LiveTailView job={job} />}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Label"
          content={job.label}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        <Action.CopyToClipboard
          title="Copy Plist Path"
          content={job.plistPath}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
        <Action.Open
          title="Open Plist in Editor"
          target={job.plistPath}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        {onToggleAppleServices && (
          <Action
            title={
              showAppleServices ? "Hide Apple Services" : "Show Apple Services"
            }
            icon={Icon.AppWindowSidebarLeft}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            onAction={onToggleAppleServices}
          />
        )}
        {onRefresh && (
          <Action
            title="Refresh Job List"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={onRefresh}
          />
        )}
        <Action
          title="Open Extension Preferences"
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
