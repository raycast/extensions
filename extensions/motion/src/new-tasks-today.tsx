import { ActionPanel, List, Action, Icon, showToast, Toast, Color, Detail } from "@raycast/api";
import { useState, useEffect } from "react";
import { getTasks, MotionTask } from "./motion-api";

interface State {
  tasks: MotionTask[];
  isLoading: boolean;
  error?: Error;
}

function TaskDetail({ task }: { task: MotionTask }) {
  const markdown = `
# ${task.name}

${task.description || "No description provided"}

## Task Information

**Priority:** ${task.priority}  
**Status:** ${task.status?.name || "No status"}  
**Due Date:** ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}  
**Deadline Type:** ${task.deadlineType}  
**Completed:** ${task.completed ? "✅ Yes" : "❌ No"}  

${task.project ? `**Project:** ${task.project.Name}` : ""}

## Scheduling

${task.scheduledStart ? `**Scheduled Start:** ${new Date(task.scheduledStart).toLocaleString()}` : "**Scheduled Start:** Not scheduled"}  
${task.scheduledEnd ? `**Scheduled End:** ${new Date(task.scheduledEnd).toLocaleString()}` : "**Scheduled End:** Not scheduled"}  
${task.schedulingIssue ? "⚠️ **Scheduling Issue:** This task has scheduling conflicts" : ""}

## Team

**Creator:** ${task.creator.name} (${task.creator.email})  
${task.assignees.length > 0 ? `**Assignees:** ${task.assignees.map((a) => `${a.name} (${a.email})`).join(", ")}` : "**Assignees:** None"}

## Labels

${task.labels.length > 0 ? task.labels.map((label) => `• ${label.name}`).join("\n") : "No labels"}

---

*Created: ${new Date(task.createdTime).toLocaleString()}*  
*Task ID: ${task.id}*
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={task.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Priority" text={task.priority} />
          <Detail.Metadata.Label title="Status" text={task.status?.name || "No status"} />
          <Detail.Metadata.Label title="Completed" text={task.completed ? "Yes" : "No"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Due Date"
            text={task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}
          />
          <Detail.Metadata.Label title="Deadline Type" text={task.deadlineType} />
          <Detail.Metadata.Separator />
          {task.project && (
            <>
              <Detail.Metadata.Label title="Project" text={task.project.Name} />
              <Detail.Metadata.Separator />
            </>
          )}
          <Detail.Metadata.Label title="Creator" text={`${task.creator.name}`} />
          {task.assignees.length > 0 && (
            <Detail.Metadata.TagList title="Assignees">
              {task.assignees.map((assignee) => (
                <Detail.Metadata.TagList.Item key={assignee.id} text={assignee.name} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {task.labels.length > 0 && (
            <Detail.Metadata.TagList title="Labels">
              {task.labels.map((label, index) => (
                <Detail.Metadata.TagList.Item key={index} text={label.name} color={Color.Blue} />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Created" text={new Date(task.createdTime).toLocaleString()} />
          {task.schedulingIssue && <Detail.Metadata.Label title="Scheduling Issue" text="Yes" />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Motion" url={`https://app.usemotion.com/tasks/${task.id}`} />
          <Action.CopyToClipboard
            title="Copy Task Name"
            content={task.name}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Task ID"
            content={task.id}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Task URL"
            content={`https://app.usemotion.com/tasks/${task.id}`}
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [state, setState] = useState<State>({
    tasks: [],
    isLoading: true,
  });

  useEffect(() => {
    async function fetchTodaysTasks() {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: undefined }));
        const response = await getTasks();

        // Filter tasks created today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todaysTasks = response.tasks.filter((task) => {
          const createdDate = new Date(task.createdTime);
          createdDate.setHours(0, 0, 0, 0);
          return createdDate.getTime() === today.getTime();
        });

        setState((prev) => ({ ...prev, tasks: todaysTasks, isLoading: false }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error : new Error("Unknown error"),
          isLoading: false,
        }));
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load today's tasks",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    fetchTodaysTasks();
  }, []);

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "ASAP":
        return { source: Icon.ExclamationMark, tintColor: Color.Red };
      case "HIGH":
        return { source: Icon.ArrowUp, tintColor: Color.Orange };
      case "MEDIUM":
        return { source: Icon.Minus, tintColor: Color.Yellow };
      case "LOW":
        return { source: Icon.ArrowDown, tintColor: Color.Blue };
      default:
        return Icon.Circle;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return undefined;
    return new Date(dateString).toLocaleDateString();
  };

  const getTaskSubtitle = (task: MotionTask) => {
    const parts = [];
    if (task.project?.Name) parts.push(task.project.Name);
    if (task.status?.name) parts.push(task.status.name);
    if (task.dueDate) parts.push(`Due: ${formatDate(task.dueDate)}`);
    return parts.join(" • ");
  };

  const getTaskAccessories = (task: MotionTask) => {
    const accessories = [];

    if (task.completed) {
      accessories.push({ icon: Icon.CheckCircle, tintColor: Color.Green });
    }

    if (task.schedulingIssue) {
      accessories.push({ icon: Icon.Warning, tintColor: Color.Red });
    }

    if (task.assignees.length > 0) {
      accessories.push({ text: task.assignees.map((a) => a.name).join(", ") });
    }

    // Add creation time
    const createdTime = new Date(task.createdTime).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    accessories.push({ text: `Created: ${createdTime}` });

    return accessories;
  };

  const sortTasks = (tasks: MotionTask[]): MotionTask[] => {
    return tasks.sort((a, b) => {
      // Sort by priority first (ASAP > HIGH > MEDIUM > LOW)
      const priorityOrder = { ASAP: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Then by creation time (newest first)
      return new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime();
    });
  };

  const sortedTasks = sortTasks(state.tasks);

  return (
    <List
      isLoading={state.isLoading}
      searchBarPlaceholder="Search today's new tasks..."
      navigationTitle="New Tasks for Today"
    >
      {sortedTasks.map((task) => (
        <List.Item
          key={task.id}
          icon={getPriorityIcon(task.priority)}
          title={task.name}
          subtitle={getTaskSubtitle(task)}
          accessories={getTaskAccessories(task)}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<TaskDetail task={task} />} icon={Icon.Eye} />
              <Action.OpenInBrowser title="Open in Motion" url={`https://app.usemotion.com/tasks/${task.id}`} />
              <Action.CopyToClipboard
                title="Copy Task Name"
                content={task.name}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Task ID"
                content={task.id}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Task URL"
                content={`https://app.usemotion.com/tasks/${task.id}`}
                shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
      {!state.isLoading && sortedTasks.length === 0 && (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No new tasks created today"
          description="You haven't created any tasks today yet. Use 'Capture Motion Task' to create one!"
        />
      )}
      {state.error && (
        <List.EmptyView icon={Icon.ExclamationMark} title="Failed to load tasks" description={state.error.message} />
      )}
    </List>
  );
}
