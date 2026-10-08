import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useMemo, useRef, useState } from "react";
import { getProjectNameById } from "../service/project";
import { Task } from "../service/task";
import { addSpaceBetweenEmojiAndText } from "../utils/text";
import { toggleTask } from "../service/osScript";
import { formatPrettyDateTime } from "../utils/date";

const TaskItem: React.FC<{
  id: Task["id"];
  title: Task["title"];
  priority: Task["priority"];
  projectId: Task["projectId"];
  tags: Task["tags"];
  actionType: "today" | "week" | "project";
  detailMarkdown: string;
  copyContent: string;
  dueDate?: Task["dueDate"];
  startDate?: Task["startDate"];
  isAllDay: Task["isAllDay"];
  isFloating: Task["isFloating"];
  timeZone: Task["timeZone"];
  refresh: () => void;
}> = (props) => {
  const {
    id,
    title,
    priority,
    projectId,
    actionType,
    dueDate,
    startDate,
    isFloating,
    isAllDay,
    timeZone,
    detailMarkdown,
    tags,
    copyContent,
    refresh,
  } = props;

  const projectName = useMemo(() => {
    return getProjectNameById(projectId) || "";
  }, [projectId]);

  const togglingRef = useRef(false);
  const [isChecked, setIsChecked] = useState(false);

  const checkboxColor = useMemo(() => {
    switch (priority) {
      case 0:
        return Color.PrimaryText;
      case 1:
        return Color.Blue;
      case 3:
        return Color.Yellow;
      case 5:
        return Color.Red;
      default:
        return Color.PrimaryText;
    }
  }, [priority]);

  const priorityText = useMemo(() => {
    switch (priority) {
      case 1:
        return "Low";
      case 3:
        return "Medium";
      case 5:
        return "High";
      case 0:
      default:
        return "None";
    }
  }, [priority]);

  const target = useMemo(() => {
    if (actionType === "project") {
      return `ticktick://widget.view.task.in.project/${projectId}/${id}`;
    }
    return `ticktick://widget.view.task.in.smartproject/${actionType}/${id}`;
  }, [actionType, id, projectId]);

  const dateSections = useMemo(() => {
    if (!startDate) {
      return null;
    } else if (!dueDate || startDate === dueDate) {
      return (
        <>
          <List.Item.Detail.Metadata.Label
            title="Date"
            text={formatPrettyDateTime(startDate, timeZone, isFloating, isAllDay)}
          />
          <List.Item.Detail.Metadata.Separator />
        </>
      );
    } else {
      return (
        <>
          <List.Item.Detail.Metadata.Label
            title="Start"
            text={formatPrettyDateTime(startDate, timeZone, isFloating, isAllDay)}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="End"
            text={formatPrettyDateTime(dueDate, timeZone, isFloating, isAllDay)}
          />
          <List.Item.Detail.Metadata.Separator />
        </>
      );
    }
  }, [startDate, dueDate, timeZone, isFloating, isAllDay]);

  return (
    <List.Item
      title={title || "Untitled"}
      icon={{ source: isChecked ? Icon.CheckCircle : Icon.Circle, tintColor: checkboxColor }}
      actions={
        <ActionPanel>
          <Action.Open title="View" target={target} icon={Icon.Eye} />
          <Action
            title="Complete"
            onAction={async () => {
              if (togglingRef.current) return;
              togglingRef.current = true;
              setIsChecked(true);
              const result = await toggleTask(id);
              if (result) {
                refresh();
                showToast(Toast.Style.Success, `${title} Completed`);
              } else {
                setIsChecked(false);
              }
              togglingRef.current = false;
            }}
            icon={Icon.CheckCircle}
          />
          <Action.CopyToClipboard title="Copy" content={copyContent} icon={Icon.Clipboard} />
        </ActionPanel>
      }
      accessories={[{ text: addSpaceBetweenEmojiAndText(projectName) }]}
      detail={
        <List.Item.Detail
          markdown={detailMarkdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="List" text={addSpaceBetweenEmojiAndText(projectName)} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Priority"
                text={priorityText}
                icon={{ source: Icon.Dot, tintColor: checkboxColor }}
              />
              <List.Item.Detail.Metadata.Separator />
              {dateSections}
              {tags.length ? (
                <>
                  <List.Item.Detail.Metadata.Label title="Tags" text={tags.join(", ")} />
                  <List.Item.Detail.Metadata.Separator />
                </>
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
};

export default TaskItem;
