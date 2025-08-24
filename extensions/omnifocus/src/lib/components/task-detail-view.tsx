import { Action, ActionPanel, Detail, Icon, Keyboard, open } from "@raycast/api";
import { OmniFocusTask } from "../types/task";

type TaskMetadataItem = {
  title: string;
  value: string;
};

interface TaskDetailViewProps {
  task: OmniFocusTask;
  onComplete: () => Promise<void>;
  onDelete: () => Promise<void>;
  onCleanup: () => Promise<void>;
}

export function TaskDetailView({ task, onComplete, onDelete, onCleanup }: TaskDetailViewProps) {
  const metadata: TaskMetadataItem[] = [
    { title: "Status", value: task.completed ? "Completed" : "Active" },
    { title: "Flagged", value: task.flagged ? "Yes" : "No" },
    ...(task.projectName ? [{ title: "Project", value: task.projectName }] : []),
    ...(task.deferDate ? [{ title: "Defer Date", value: new Date(task.deferDate).toLocaleDateString() }] : []),
    ...(task.dueDate ? [{ title: "Due Date", value: new Date(task.dueDate).toLocaleDateString() }] : []),
    ...(task.tags.length > 0 ? [{ title: "Tags", value: task.tags.join(", ") }] : []),
  ];

  const markdown = `
# ${task.name}

${metadata.map((item) => `**${item.title}:** ${item.value}`).join("\n\n")}

${task.note ? `\n## Notes\n\n${task.note}` : ""}
  `.trim();

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Open in Omnifocus" onAction={() => open(`omnifocus:///task/${task.id}`)} icon={Icon.Eye} />
            <Action title="Complete" onAction={onComplete} icon={Icon.CheckCircle} />
            <Action
              title="Clean Up"
              onAction={onCleanup}
              icon={Icon.Checkmark}
              shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
            />
            <Action
              title="Delete"
              style={Action.Style.Destructive}
              onAction={onDelete}
              icon={Icon.Trash}
              shortcut={Keyboard.Shortcut.Common.Remove}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
