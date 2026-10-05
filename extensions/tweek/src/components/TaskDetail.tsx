import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import React from "react";
import {
  DateFormatPreference,
  TweekCalendar,
  TweekCustomColor,
  TweekTask,
  UpdateType,
} from "../types";
import {
  formatRelativeTaskDate,
  formatTaskDate,
  parseVirtualTaskId,
} from "../utils/date-utils";
import {
  formatTaskCopyText,
  formatTaskMarkdown,
  getChecklistProgress,
  getRecurrenceDescription,
  isRecurringTask,
  resolveTaskColor,
} from "../utils/format-task";

export interface TaskDetailProps {
  task: TweekTask;
  calendar?: TweekCalendar;
  customColors: TweekCustomColor[];
  dateFormat?: DateFormatPreference;
  onToggleComplete?: (task: TweekTask, updateType?: UpdateType) => void;
  onDelete?: (task: TweekTask, updateType?: UpdateType) => void;
}

export function TaskItemDetailPane({
  task,
  calendar,
  customColors,
  dateFormat = "dd/MM/yyyy",
}: TaskDetailProps) {
  const markdown = formatTaskMarkdown(task, calendar, customColors, dateFormat);
  const colorInfo = resolveTaskColor(task.color, customColors);
  const recurrence = getRecurrenceDescription(task);
  const checklist = getChecklistProgress(task);
  const parsedId = parseVirtualTaskId(task.id);

  const somedayListName =
    !task.date && task.listId && calendar?.lists
      ? calendar.lists.find((l) => l.id === task.listId)?.name || "Someday List"
      : null;

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={task.done ? "Completed" : "Pending"}
              color={task.done ? Color.Green : Color.Orange}
              icon={task.done ? Icon.CheckCircle : Icon.Circle}
            />
            {colorInfo.id !== "blank" && (
              <List.Item.Detail.Metadata.TagList.Item
                text={colorInfo.label}
                color={colorInfo.raycastColor}
              />
            )}
          </List.Item.Detail.Metadata.TagList>

          {calendar && (
            <List.Item.Detail.Metadata.Label
              title="Calendar"
              text={calendar.name}
              icon={Icon.Calendar}
            />
          )}

          <List.Item.Detail.Metadata.Label
            title={somedayListName ? "Someday List" : "Date"}
            text={
              somedayListName
                ? somedayListName
                : `${formatRelativeTaskDate(task.date, dateFormat)} (${formatTaskDate(task.date, dateFormat)})`
            }
            icon={somedayListName ? Icon.Tray : Icon.Clock}
          />

          {recurrence && (
            <List.Item.Detail.Metadata.Label
              title="Recurrence"
              text={recurrence}
              icon={Icon.Repeat}
            />
          )}

          {checklist && (
            <List.Item.Detail.Metadata.Label
              title="Subtasks"
              text={`${checklist.completed} of ${checklist.total} completed`}
              icon={Icon.CheckList}
            />
          )}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Task ID" text={task.id} />

          {parsedId.isVirtual && (
            <List.Item.Detail.Metadata.Label
              title="Occurrence Type"
              text={`Virtual (${parsedId.occurrenceDate})`}
              icon={Icon.Stars}
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function TaskDetail({
  task,
  calendar,
  customColors,
  dateFormat = "dd/MM/yyyy",
  onToggleComplete,
  onDelete,
}: TaskDetailProps) {
  const markdown = formatTaskMarkdown(task, calendar, customColors, dateFormat);
  const colorInfo = resolveTaskColor(task.color, customColors);
  const recurrence = getRecurrenceDescription(task);
  const recurring = isRecurringTask(task);

  return (
    <Detail
      navigationTitle={task.text}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status & Badge">
            <Detail.Metadata.TagList.Item
              text={task.done ? "Completed" : "Pending"}
              color={task.done ? Color.Green : Color.Orange}
            />
            {colorInfo.id !== "blank" && (
              <Detail.Metadata.TagList.Item
                text={colorInfo.label}
                color={colorInfo.raycastColor}
              />
            )}
          </Detail.Metadata.TagList>

          {calendar && (
            <Detail.Metadata.Label
              title="Calendar"
              text={calendar.name}
              icon={Icon.Calendar}
            />
          )}

          <Detail.Metadata.Label
            title="Date"
            text={formatRelativeTaskDate(task.date, dateFormat)}
            icon={Icon.Clock}
          />

          {recurrence && (
            <Detail.Metadata.Label
              title="Recurrence"
              text={recurrence}
              icon={Icon.Repeat}
            />
          )}

          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Open in Tweek"
            target="https://tweek.so"
            text="tweek.so"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {onToggleComplete && (
            <Action
              title={task.done ? "Mark as Pending" : "Mark as Completed"}
              icon={task.done ? Icon.Circle : Icon.CheckCircle}
              onAction={() => onToggleComplete(task)}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Task Description"
            content={formatTaskCopyText(task, dateFormat)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Markdown Details"
            content={markdown}
          />
          <Action.OpenInBrowser
            title="Open Calendar in Tweek"
            url="https://tweek.so"
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          {onDelete && !recurring && (
            <Action
              title="Delete Task"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() => onDelete(task)}
            />
          )}
          {onDelete && recurring && (
            <ActionPanel.Submenu
              title="Delete Recurring Task…"
              icon={Icon.Trash}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            >
              <Action
                title="Delete Only This Occurrence"
                style={Action.Style.Destructive}
                onAction={() => onDelete(task, "only_this")}
              />
              <Action
                title="Delete This and Future Occurrences"
                style={Action.Style.Destructive}
                onAction={() => onDelete(task, "this_and_future")}
              />
              <Action
                title="Delete Entire Recurring Series (all Linked)"
                style={Action.Style.Destructive}
                onAction={() => onDelete(task, "all_linked")}
              />
            </ActionPanel.Submenu>
          )}
        </ActionPanel>
      }
    />
  );
}
