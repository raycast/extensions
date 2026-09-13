import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type { ReactElement } from "react";

import type { DomainTaskItemModel, DomainTaskPriorityLabel, DomainTaskStatusLabel } from "./domainTaskItemModel";

export type DomainTaskItemHandler = () => void | Promise<void>;

export type DomainTaskItemProps = Readonly<{
  model: DomainTaskItemModel;
  onComplete?: DomainTaskItemHandler;
  onReopen?: DomainTaskItemHandler;
  onEdit?: DomainTaskItemHandler;
  onMove?: DomainTaskItemHandler;
  onRefresh?: DomainTaskItemHandler;
}>;

export function DomainTaskItem({
  model,
  onComplete,
  onReopen,
  onEdit,
  onMove,
  onRefresh,
}: DomainTaskItemProps): ReactElement {
  const priorityColor = colorForPriority(model.metadata.priority);
  const renderedActions = model.actions.flatMap((descriptor) => {
    switch (descriptor.key) {
      case "complete":
        return onComplete
          ? [
              <Action
                key={descriptor.key}
                title={descriptor.title}
                shortcut={descriptor.shortcut}
                onAction={onComplete}
              />,
            ]
          : [];
      case "reopen":
        return onReopen
          ? [
              <Action
                key={descriptor.key}
                title={descriptor.title}
                shortcut={descriptor.shortcut}
                onAction={onReopen}
              />,
            ]
          : [];
      case "edit":
        return onEdit
          ? [<Action key={descriptor.key} title={descriptor.title} shortcut={descriptor.shortcut} onAction={onEdit} />]
          : [];
      case "move":
        return onMove
          ? [<Action key={descriptor.key} title={descriptor.title} shortcut={descriptor.shortcut} onAction={onMove} />]
          : [];
      case "refresh":
        return onRefresh
          ? [
              <Action
                key={descriptor.key}
                title={descriptor.title}
                shortcut={descriptor.shortcut}
                onAction={onRefresh}
              />,
            ]
          : [];
      case "open-exact":
        return model.exactTarget
          ? [
              <Action.Open
                key={descriptor.key}
                title={descriptor.title}
                shortcut={descriptor.shortcut}
                target={model.exactTarget}
              />,
            ]
          : [];
      case "search":
        return model.searchTarget
          ? [
              <Action.Open
                key={descriptor.key}
                title={descriptor.title}
                shortcut={descriptor.shortcut}
                target={model.searchTarget}
              />,
            ]
          : [];
      case "copy":
        return [
          <Action.CopyToClipboard
            key={descriptor.key}
            title={descriptor.title}
            shortcut={descriptor.shortcut}
            content={model.copyText}
          />,
        ];
    }
  });
  const date = model.metadata.date;
  const hasVisibleDate = date !== undefined && (date.start !== undefined || date.due !== undefined);
  const checklist = model.metadata.checklist;

  return (
    <List.Item
      id={model.rowId}
      title={model.title}
      icon={{
        source: model.metadata.status === "Completed" ? Icon.CheckCircle : Icon.Circle,
        tintColor: priorityColor,
      }}
      accessories={[
        { text: model.metadata.project, tooltip: "List" },
        {
          tag: { value: model.metadata.status, color: colorForStatus(model.metadata.status) },
          tooltip: "Status",
        },
        { tag: { value: model.metadata.priority, color: priorityColor }, tooltip: "Priority" },
      ]}
      detail={
        <List.Item.Detail
          markdown={model.detailMarkdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="List" text={model.metadata.project} />
              <List.Item.Detail.Metadata.Label title="Status" text={model.metadata.status} />
              <List.Item.Detail.Metadata.Label title="Priority" text={model.metadata.priority} />
              <List.Item.Detail.Metadata.Label title="Type" text={model.metadata.kind} />
              {hasVisibleDate && date.start ? (
                <List.Item.Detail.Metadata.Label title="Start" text={date.start} />
              ) : null}
              {hasVisibleDate && date.due ? <List.Item.Detail.Metadata.Label title="Due" text={date.due} /> : null}
              {hasVisibleDate ? <List.Item.Detail.Metadata.Label title="Time Zone" text={date.timeZone} /> : null}
              {model.metadata.tags.length > 0 ? (
                <List.Item.Detail.Metadata.Label title="Tags" text={model.metadata.tags.join(", ")} />
              ) : null}
              {checklist && checklist.total > 0 ? (
                <List.Item.Detail.Metadata.Label
                  title="Checklist"
                  text={`${checklist.completed} of ${checklist.total} completed`}
                />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={renderedActions.length > 0 ? <ActionPanel>{renderedActions}</ActionPanel> : undefined}
    />
  );
}

function colorForStatus(status: DomainTaskStatusLabel): Color {
  return status === "Completed" ? Color.Green : Color.SecondaryText;
}

function colorForPriority(priority: DomainTaskPriorityLabel): Color {
  switch (priority) {
    case "None":
      return Color.PrimaryText;
    case "Low":
      return Color.Blue;
    case "Medium":
      return Color.Yellow;
    case "High":
      return Color.Red;
  }
}

export default DomainTaskItem;
