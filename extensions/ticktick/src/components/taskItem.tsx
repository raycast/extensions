import { ActionPanel, Color, Icon, List, OpenAction } from "@raycast/api";
import { useCallback, useMemo } from "react";
import { getProjectNameById } from "../service/project";
import { Task } from "../service/task";
import { addSpaceBetweenEmojiAndText } from "../utils/text";

const TaskItem: React.FC<{
  id: Task["id"];
  title: Task["title"];
  priority: Task["priority"];
  projectId: Task["projectId"];
  actionType: "today" | "week" | "project";
}> = (props) => {
  const { id, title, priority, projectId, actionType } = props;

  const projectName = useMemo(() => {
    return getProjectNameById(projectId) || "";
  }, [projectId]);

  const getCheckboxColor = useCallback((priority: Task["priority"]) => {
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
  }, []);

  const target = useMemo(() => {
    if (actionType === "project") {
      return `ticktick://widget.view.task.in.project/${projectId}/${id}`;
    }
    return `ticktick://widget.view.task.in.smartproject/${actionType}/${id}`;
  }, [actionType, id, projectId]);

  return (
    <List.Item
      title={title || "Untitled"}
      icon={{ source: Icon.Circle, tintColor: getCheckboxColor(priority) }}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Open">
            <OpenAction title="Open in TickTick" target={target} icon={Icon.Window} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessoryTitle={addSpaceBetweenEmojiAndText(projectName)}
    />
  );
};

export default TaskItem;
