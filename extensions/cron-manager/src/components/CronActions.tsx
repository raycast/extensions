import { Action, ActionPanel, Icon } from "@raycast/api";
import { CronJob } from "../types";
import CronForm from "./CronForm";

interface CronActionsProps {
  job: CronJob;
  onUpdate: (job: CronJob) => void;
  onDelete: (jobId: string) => void;
  onRun: (job: CronJob) => void;
  onToggle: (job: CronJob) => void;
  onViewLogs: () => void;
}

export default function CronActions({ job, onUpdate, onDelete, onRun, onToggle, onViewLogs }: CronActionsProps) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action title="Run Job" icon={Icon.Play} onAction={() => onRun(job)} />
        <Action.Push
          title="Edit Job"
          icon={Icon.Pencil}
          target={<CronForm job={job} onSave={onUpdate} />}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
        />
        <Action
          title={job.status === "active" ? "Pause Job" : "Resume Job"}
          icon={job.status === "active" ? Icon.Pause : Icon.Play}
          onAction={() => onToggle(job)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        />
        <Action
          title="Delete Job"
          style={Action.Style.Destructive}
          icon={Icon.Trash}
          onAction={() => onDelete(job.id)}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="View Logs"
          icon={Icon.Terminal}
          onAction={onViewLogs}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
        />
        <Action.Push
          title="Create New Job"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={<CronForm onSave={onUpdate} />}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
