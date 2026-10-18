import { Color, Icon, List } from "@raycast/api";
import { ReactNode } from "react";
import { TaskWithList } from "../types";
import { assignmentDetails, assignmentIcon, dueDay, getIcon, todayValue } from "../utils";

export default function TaskItem(props: {
  tasks: TaskWithList[];
  task: TaskWithList;
  showListTitle: boolean;
  actions: ReactNode;
}) {
  const children = props.tasks.filter((task) => task.listId === props.task.listId && task.parent === props.task.id);
  const due = dueDay(props.task.due);
  const today = todayValue();
  const dueDate = due ? new Date(`${due}T00:00:00`) : undefined;
  const dueLabel = dueDate?.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const dueText = due && due < today ? `Overdue · ${dueLabel}` : due === today ? "Today" : dueLabel;
  const dueColor = due && due < today ? Color.Red : due === today ? Color.Orange : Color.SecondaryText;
  const listTitle = props.showListTitle ? props.task.listTitle : undefined;
  const assignment = assignmentDetails(props.task.assignmentInfo);

  return (
    <List.Item
      icon={getIcon(props.task)}
      id={`${props.task.listId}-${props.task.id}`}
      title={props.task.title}
      accessories={[
        ...(assignment
          ? [{ icon: assignmentIcon(props.task.assignmentInfo), tooltip: `Assigned from ${assignment.source}` }]
          : []),
        ...(listTitle ? [{ text: { value: listTitle, color: Color.SecondaryText } }] : []),
        ...(dueText ? [{ text: { value: dueText, color: dueColor }, icon: Icon.Calendar }] : []),
      ]}
      detail={
        <List.Item.Detail
          markdown={props.task.notes || "No details."}
          metadata={
            <List.Item.Detail.Metadata>
              {listTitle ? <List.Item.Detail.Metadata.Label title="List" text={listTitle} /> : null}
              {dueText ? <List.Item.Detail.Metadata.Label title="Due" text={dueText} icon={Icon.Calendar} /> : null}
              {assignment ? (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Assigned From" text={assignment.source} />
                  {assignment.linkToTask ? (
                    <List.Item.Detail.Metadata.Link title="Task" target={assignment.linkToTask} text="Open in Source" />
                  ) : null}
                  {assignment.fileUrl ? (
                    <List.Item.Detail.Metadata.Link title="Document" target={assignment.fileUrl} text="Open in Drive" />
                  ) : null}
                  {assignment.driveFileId ? (
                    <List.Item.Detail.Metadata.Label title="Drive File ID" text={assignment.driveFileId} />
                  ) : null}
                  {assignment.resourceKey ? (
                    <List.Item.Detail.Metadata.Label title="Resource Key" text={assignment.resourceKey} />
                  ) : null}
                  {assignment.spaceUrl ? (
                    <List.Item.Detail.Metadata.Link title="Space" target={assignment.spaceUrl} text="Open in Chat" />
                  ) : null}
                </>
              ) : null}
              {props.task.webViewLink ? (
                <List.Item.Detail.Metadata.Link
                  title="Google Tasks"
                  target={props.task.webViewLink}
                  text="Open in Browser"
                />
              ) : null}
              {children.map((child) => (
                <List.Item.Detail.Metadata.Label
                  key={child.id}
                  title="Subtask"
                  text={child.title}
                  icon={getIcon(child)}
                />
              ))}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={props.actions}
    />
  );
}
