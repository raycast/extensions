import { List } from "@raycast/api";
import { Task } from "../types";
import { getTaskIcon } from "../utils/utils";

function TasksList(props: { tasks: Task[] }) {
  return (
    <List>
      {props.tasks.map((task) => {
        const accessories = [];
        if (task.status === "active" && task.progress !== "100.00%") {
          accessories.push(
            { tooltip: "Download Speed", text: ` ${task.downloadSpeed}`, icon: "🚀" },
            { tooltip: "Remaining Time", text: `${task.remainingTime}`, icon: "🕐" }
          );
        }

        accessories.push({ tooltip: "Progress", text: ` ${task.progress}`, icon: "⏳" });

        return (
          <List.Item
            icon={getTaskIcon(task.status)}
            key={task.gid}
            id={task.gid}
            title={{
              tooltip: "Task Name",
              value: task.fileName,
            }}
            subtitle={{ tooltip: "File Size", value: `💾${task.fileSize}` }}
            accessories={accessories}
          />
        );
      })}
    </List>
  );
}

export default TasksList;
