import { List, ActionPanel } from "@raycast/api";
import { Task, Status } from "../types";
import CreateTaskAction from "./CreateTaskAction";

function TasksList(props: {
  isLoading: boolean;
  tasks: Task[];
  filter: Status | "all";
  onFilterChange: (newValue: Status | "all") => void;
}) {
  console.log(props.tasks);

  const handleFilterChange = (newValue: string) => {
    props.onFilterChange(newValue as Status | "all");
  };

  return (
    <List
      isLoading={props.isLoading}
      filtering={true}
      navigationTitle="Aria2"
      searchBarPlaceholder="Search for task for Aria2"
      searchBarAccessory={
        <List.Dropdown tooltip="Select Task List" value={props.filter} onChange={handleFilterChange}>
          <List.Dropdown.Item title="All" value={"all"} />
          <List.Dropdown.Item title="Active" value={Status.Active} />
          <List.Dropdown.Item title="Paused" value={Status.Paused} />
          <List.Dropdown.Item title="Waiting" value={Status.Waiting} />
          <List.Dropdown.Item title="Complete" value={Status.Complete} />
          <List.Dropdown.Item title="Removed" value={Status.Removed} />
          <List.Dropdown.Item title="Error" value={Status.Error} />
        </List.Dropdown>
      }
    >
      {props.tasks.map((item) => (
        <List.Item
          key={item.gid}
          title={item.fileName}
          subtitle={`Status: ${item.status}`}
          icon={item.status === Status.Active ? "🚀" : "⏳"}
          actions={
            <ActionPanel title="ActionPanel title">
              <CreateTaskAction />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default TasksList;
