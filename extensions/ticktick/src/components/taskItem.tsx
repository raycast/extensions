import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCallback, useMemo } from "react";
import { getProjectNameById } from "../service/project";
import { Task } from "../service/task";
import { addSpaceBetweenEmojiAndText } from "../utils/text";

const TaskItem: React.FC<{
  id: Task["id"];
  title: Task["title"];
  priority: Task["priority"];
  projectId: Task["projectId"];
  tags: Task["tags"];
  actionType: "today" | "week" | "project";
  detailMarkdown: string;
}> = (props) => {
  const { id, title, priority, projectId, actionType, detailMarkdown, tags } = props;

  const projectName = useMemo(() => {
    return getProjectNameById(projectId) || "";
  }, [projectId]);

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

  return (
    <List.Item
      title={title || "Untitled"}
      icon={{ source: Icon.Circle, tintColor: checkboxColor }}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Open">
            <Action.Open title="Open in TickTick" target={target} icon={Icon.Window} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessoryTitle={addSpaceBetweenEmojiAndText(projectName)}
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
