import { Detail, Icon, Color } from "@raycast/api";
import { Task } from "../lib/types";
import { STATUS_COLORS, STATUS_LABELS, formatMinutes } from "../lib/utils";

interface TaskDetailProps {
  task: Task;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actions: any;
}

// Priority scale: 4=High, 3=Medium, 2=Low, 1=None
function getPriorityIcon(priority?: number | null) {
  if (!priority || priority < 2) return null;
  if (priority >= 4) return Icon.FullSignal;
  if (priority >= 3) return Icon.Signal3;
  return Icon.Signal1;
}

function getPriorityColor(priority?: number | null) {
  if (!priority || priority < 2) return Color.SecondaryText;
  if (priority >= 4) return Color.Red;
  if (priority >= 3) return Color.Yellow;
  return Color.Blue;
}

function getEnergyIcon(energy?: string | null) {
  switch (energy) {
    case "high":
      return Icon.Bolt;
    case "medium":
      return Icon.BatteryCharging;
    case "low":
      return Icon.Battery;
    default:
      return Icon.Circle;
  }
}

function getEnergyColor(energy?: string | null) {
  switch (energy) {
    case "high":
      return Color.Orange;
    case "medium":
      return Color.Yellow;
    case "low":
      return Color.Green;
    default:
      return Color.SecondaryText;
  }
}

export default function TaskDetail({ task, actions }: TaskDetailProps) {
  // Markdown generation mimicking the FE structure
  const markdown = `
# ${task.title}

${task.description ? task.description : "_No description provided_"}

---

| | |
|---|---|
| **Status** | ${STATUS_LABELS[task.status]} |
| **Deadline** | ${task.due_date ? new Date(task.due_date).toLocaleDateString() : "None"} |
| **Scheduled On** | ${task.scheduled_date ? new Date(task.scheduled_date).toLocaleDateString() : "None"} |
| **Category** | ${task.category ? task.category.charAt(0).toUpperCase() + task.category.slice(1) : "None"} |
| **Energy** | ${task.energy_required ? task.energy_required.charAt(0).toUpperCase() + task.energy_required.slice(1) : "None"} |
| **Estimate** | ${task.effort_estimate_minutes ? formatMinutes(task.effort_estimate_minutes) : "None"} |

${task.raw_input ? `\n> **Context:** ${task.raw_input}` : ""}
`;

  return (
    <Detail
      navigationTitle={task.title}
      markdown={markdown}
      actions={actions}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={STATUS_LABELS[task.status]}
              color={STATUS_COLORS[task.status]}
            />
          </Detail.Metadata.TagList>

          <Detail.Metadata.TagList title="Priority">
            {task.priority ? (
              <Detail.Metadata.TagList.Item
                text={`P${task.priority}`}
                color={getPriorityColor(task.priority)}
                icon={getPriorityIcon(task.priority) || undefined}
              />
            ) : (
              <Detail.Metadata.TagList.Item
                text="None"
                color={Color.SecondaryText}
              />
            )}
          </Detail.Metadata.TagList>

          <Detail.Metadata.Label
            title="Energy"
            text={
              task.energy_required
                ? task.energy_required.charAt(0).toUpperCase() +
                  task.energy_required.slice(1)
                : "None"
            }
            icon={{
              source: getEnergyIcon(task.energy_required),
              tintColor: getEnergyColor(task.energy_required),
            }}
          />

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label
            title="Deadline"
            text={
              task.due_date
                ? new Date(task.due_date).toLocaleDateString()
                : "None"
            }
            icon={Icon.Calendar}
          />

          <Detail.Metadata.Label
            title="Scheduled On"
            text={
              task.scheduled_date
                ? new Date(task.scheduled_date).toLocaleDateString()
                : "None"
            }
            icon={Icon.Clock}
          />

          <Detail.Metadata.Label
            title="Category"
            text={
              task.category
                ? task.category.charAt(0).toUpperCase() + task.category.slice(1)
                : "Uncategorized"
            }
            icon={Icon.Folder}
          />

          {task.tags && task.tags.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {task.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
    />
  );
}
