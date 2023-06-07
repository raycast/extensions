import { List } from "@raycast/api";
import { Task, Filter } from "../types";
import { getTaskIcon } from "../utils/utils";

type Props = {
  isLoading: boolean;
  tasks: Task[];
  onFilterChange: (filter: Filter) => void;
};

const TasksList = ({ isLoading, tasks, onFilterChange }: Props) => {
  const handleFilterChange = (newValue: string) => {
    const filter: Filter = newValue as Filter;
    onFilterChange(filter);
  };

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Tasks" onChange={handleFilterChange}>
          {Object.values(Filter).map((filter) => (
            <List.Dropdown.Item key={filter} title={filter} value={filter} />
          ))}
        </List.Dropdown>
      }
    >
      {tasks.map((task) => {
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
};

export default TasksList;
