import { Color, Icon, List } from "@raycast/api";
import { useTask } from "./hooks/useTask";
import { Task } from "./types/task";
import { useEffect, useMemo, useState } from "react";
        
// Dropdown Menu for Status types -> https://developers.raycast.com/api-reference/user-interface/list#list.dropdown
type StatusDropdownProps = {
  tasks: Task[];
  onStatusChange: (newValue: string) => void;
};

const StatusDropdown = (props: StatusDropdownProps) => {
  const { tasks, onStatusChange } = props;
  const statusTypes = useMemo(() => Array.from(new Set(tasks.map((task) => task.status))), [tasks]); // using useMemo() to avoid re-rendering the list every time the status changes

  return (
    <List.Dropdown
      tooltip="Select Status"
      storeValue={true}
      onChange={(newValue) => {
        onStatusChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Status">
        {statusTypes.map((statusType) => (
          <List.Dropdown.Item key={statusType} title={statusType} value={statusType} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
};


const TaskList = () => {
  const { getAllTasks } = useTask();
  const [tasks, setTasks] = useState<Task[]>([]);
  // const [isLoading, setIsLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");

  useEffect(() => {

    const fetchTasks = async () => {
      const tasks = await getAllTasks();
      setTasks(tasks);
    };

    fetchTasks();
  }, [getAllTasks]);

  const filteredTasks = useMemo(() => {
    if (!selectedStatus) {
      return tasks;
    }

    return tasks.filter((task) => task.status === selectedStatus);
  }, [tasks, selectedStatus]);

  return (
    <List 
    // isLoading={isLoading}
    navigationTitle="Search Tasks"
    searchBarAccessory={
      <StatusDropdown tasks={tasks} onStatusChange={setSelectedStatus} />
    }
    >
      {filteredTasks?.map((task: Task) => (
        <List.Item 
          key={task.id} 
          title={task.title} 
          accessories={[
            { text: { value: task.status, color: Color.PrimaryText } },
            { tag: { value: (task.timeChunksRemaining / 4).toString() + "h", color: Color.Green }, tooltip: "Time remaining"},
            { tag: { value: new Date(task.due), color: Color.Red }, tooltip: "Due date" },
          ]}
        />
      ))}
    </List>
  );
};

export default function Command() {
  return (
    <TaskList />
  );
}

