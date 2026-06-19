import { Detail, ActionPanel, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { runBacklog } from "./backlog";
import EditTask from "./edit-task";

export interface TaskData {
  id: string;
  title: string;
  status: string;
  priority: string;
  created: string;
  labels: string[];
  milestone: string;
  assignee: string;
  description: string;
  acceptanceCriteria: string[];
  definitionOfDone: string[];
  dependencies: string[];
  references: string[];
  documentation: string[];
  notes: string;
  filePath: string;
}

const PRIORITY_COLORS: Record<string, Color> = {
  high: Color.Red,
  medium: Color.Orange,
  low: Color.SecondaryText,
};

const QUICK_STATUSES = [
  { title: "To Do", value: "to do", icon: Icon.Circle },
  { title: "In Progress", value: "in progress", icon: Icon.CircleProgress50 },
  { title: "Done", value: "done", icon: Icon.CheckCircle },
  { title: "Blocked", value: "blocked", icon: Icon.XMarkCircle },
];

export function parseTaskView(output: string): TaskData {
  const task: TaskData = {
    id: "",
    title: "",
    status: "",
    priority: "",
    created: "",
    labels: [],
    milestone: "",
    assignee: "",
    description: "",
    acceptanceCriteria: [],
    definitionOfDone: [],
    dependencies: [],
    references: [],
    documentation: [],
    notes: "",
    filePath: "",
  };

  const lines = output.split("\n");
  let currentSection = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("File:")) {
      task.filePath = trimmed.replace("File:", "").trim();
      continue;
    }

    if (trimmed.startsWith("Task ") && trimmed.includes(" - ")) {
      const titleMatch = trimmed.match(/^Task\s+([\w-]+)\s+-\s+(.+)$/);
      if (titleMatch) {
        task.id = titleMatch[1];
        task.title = titleMatch[2];
      }
      continue;
    }

    if (trimmed.match(/^=+$/) || trimmed.match(/^-+$/)) continue;

    if (trimmed === "Description:") {
      currentSection = "description";
      continue;
    }
    if (trimmed === "Acceptance Criteria:") {
      currentSection = "ac";
      continue;
    }
    if (trimmed === "Definition of Done:") {
      currentSection = "dod";
      continue;
    }
    if (trimmed === "Implementation Notes:") {
      currentSection = "notes";
      continue;
    }
    if (trimmed === "Dependencies:") {
      currentSection = "dependencies";
      continue;
    }
    if (trimmed === "References:") {
      currentSection = "references";
      continue;
    }
    if (trimmed === "Documentation:") {
      currentSection = "documentation";
      continue;
    }

    if (trimmed.startsWith("Status:")) {
      task.status = trimmed
        .replace("Status:", "")
        .replace(/[○●◐✕]/g, "")
        .trim();
      continue;
    }
    if (trimmed.startsWith("Priority:")) {
      task.priority = trimmed.replace("Priority:", "").trim().toLowerCase();
      continue;
    }
    if (trimmed.startsWith("Created:")) {
      task.created = trimmed.replace("Created:", "").trim();
      continue;
    }
    if (trimmed.startsWith("Labels:")) {
      task.labels = trimmed
        .replace("Labels:", "")
        .trim()
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean);
      continue;
    }
    if (trimmed.startsWith("Milestone:")) {
      task.milestone = trimmed.replace("Milestone:", "").trim();
      continue;
    }
    if (trimmed.startsWith("Assignee:")) {
      task.assignee = trimmed.replace("Assignee:", "").trim();
      continue;
    }

    if (currentSection === "description" && trimmed) {
      task.description += (task.description ? "\n" : "") + trimmed;
    }
    if (currentSection === "notes" && trimmed) {
      task.notes += (task.notes ? "\n" : "") + trimmed;
    }
    if ((currentSection === "ac" || currentSection === "dod") && trimmed.startsWith("- [")) {
      (currentSection === "ac" ? task.acceptanceCriteria : task.definitionOfDone).push(trimmed);
    }
    if (currentSection === "dependencies" && trimmed.startsWith("-")) {
      task.dependencies.push(trimmed.replace(/^-\s*/, ""));
    }
    if (currentSection === "references" && trimmed.startsWith("-")) {
      task.references.push(trimmed.replace(/^-\s*/, ""));
    }
    if (currentSection === "documentation" && trimmed.startsWith("-")) {
      task.documentation.push(trimmed.replace(/^-\s*/, ""));
    }
  }

  return task;
}

function buildMarkdown(task: TaskData): string {
  const parts: string[] = [];

  parts.push(`# ${task.id} — ${task.title}\n`);

  if (task.description) {
    parts.push(task.description + "\n");
  }

  if (task.acceptanceCriteria.length > 0) {
    parts.push("## Acceptance Criteria\n");
    for (const ac of task.acceptanceCriteria) parts.push(ac);
    parts.push("");
  }

  if (task.definitionOfDone.length > 0 && !task.definitionOfDone[0].includes("No Definition of Done")) {
    parts.push("## Definition of Done\n");
    for (const dod of task.definitionOfDone) parts.push(dod);
    parts.push("");
  }

  if (task.notes) {
    parts.push("## Notes\n");
    parts.push(task.notes + "\n");
  }

  if (task.references.length > 0) {
    parts.push("## References\n");
    for (const ref of task.references) parts.push(`- ${ref}`);
    parts.push("");
  }

  if (task.documentation.length > 0) {
    parts.push("## Documentation\n");
    for (const doc of task.documentation) parts.push(`- ${doc}`);
    parts.push("");
  }

  return parts.join("\n");
}

export async function setTaskStatus(taskId: string, status: string, projectDir: string) {
  await showToast({ style: Toast.Style.Animated, title: `Setting ${taskId} to ${status}...` });
  try {
    await runBacklog(["task", "edit", taskId, "--status", status, "--plain"], projectDir);
    await showToast({ style: Toast.Style.Success, title: `${taskId} → ${status}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await showToast({ style: Toast.Style.Failure, title: "Failed to update status", message: message.split("\n")[0] });
  }
}

export default function TaskDetail({
  taskId,
  projectDir,
  onRefresh,
}: {
  taskId: string;
  projectDir: string;
  onRefresh?: () => void;
}) {
  const { isLoading, data, revalidate } = usePromise(
    async (id: string, cwd: string) => {
      const stdout = await runBacklog(["task", "view", id, "--plain"], cwd);
      return parseTaskView(stdout);
    },
    [taskId, projectDir],
    {
      onError: (error) => {
        showToast({ style: Toast.Style.Failure, title: "Failed to load task", message: error.message });
      },
    },
  );

  const task = data;
  const markdown = task ? buildMarkdown(task) : "Loading...";

  const refresh = () => {
    revalidate();
    onRefresh?.();
  };

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={task ? `${task.id} — ${task.title}` : taskId}
      markdown={markdown}
      metadata={
        task ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Status" text={task.status} />
            <Detail.Metadata.Label
              title="Priority"
              text={task.priority || "none"}
              icon={{ source: Icon.Signal3, tintColor: PRIORITY_COLORS[task.priority] || Color.SecondaryText }}
            />
            {task.assignee ? <Detail.Metadata.Label title="Assignee" text={task.assignee} /> : null}
            {task.milestone ? <Detail.Metadata.Label title="Milestone" text={task.milestone} /> : null}
            {task.created ? <Detail.Metadata.Label title="Created" text={task.created} /> : null}
            {task.labels.length > 0 ? (
              <Detail.Metadata.TagList title="Labels">
                {task.labels.map((label) => (
                  <Detail.Metadata.TagList.Item key={label} text={label} color={Color.Blue} />
                ))}
              </Detail.Metadata.TagList>
            ) : null}
            {task.dependencies.length > 0 ? (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.TagList title="Dependencies">
                  {task.dependencies.map((dep) => (
                    <Detail.Metadata.TagList.Item key={dep} text={dep} color={Color.Orange} />
                  ))}
                </Detail.Metadata.TagList>
              </>
            ) : null}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {task && (
            <Action.Push
              title="Edit Task"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={<EditTask task={task} projectDir={projectDir} onComplete={refresh} />}
            />
          )}
          {task?.filePath && <Action.Open title="Open Task File" target={task.filePath} icon={Icon.Document} />}
          <Action.CopyToClipboard title="Copy Task ID" content={taskId} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={refresh}
          />
          {task && (
            <ActionPanel.Section title="Set Status">
              {QUICK_STATUSES.filter((s) => s.value !== task.status.toLowerCase()).map((s) => (
                <Action
                  key={s.value}
                  title={s.title}
                  icon={s.icon}
                  onAction={async () => {
                    await setTaskStatus(taskId, s.value, projectDir);
                    refresh();
                  }}
                />
              ))}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
