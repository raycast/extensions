import { Color, Icon, List } from "@raycast/api";
import { useTask } from "./hooks/useTask";
import { Task } from "./types/task";
import { useEffect, useMemo, useState } from "react";
        
// Dropdown Menu for Status types -> https://developers.raycast.com/api-reference/user-interface/list#list.dropdown
type StatusDropdownProps = {
  tasks: Task[];
  onStatusChange: (newValue: string) => void;
};

const ARCHIVED_STATUS = "ARCHIVED";
const COMPLETE_STATUS = "COMPLETE";

const StatusDropdown = (props: StatusDropdownProps) => {
  const { tasks, onStatusChange } = props;
  const statusTypes = useMemo(() => Array.from(new Set(tasks.map((task) => task.status))), [tasks]); // using useMemo() to avoid re-rendering the list every time the status changes

    return (
      <List.Dropdown
        tooltip="Select Status"
        storeValue={true}
        onChange={(newValue) => {
          onStatusChange(newValue ?? "");
        }}
      >
        {statusTypes.map((statusType) => (
          <List.Dropdown.Item
          key={statusType}
          title={statusType == ARCHIVED_STATUS ? "Marked done" : statusType == COMPLETE_STATUS ? "Done scheduling" : "Open"} // If task is archived, show 
          value={statusType} />
        ))}
      </List.Dropdown>
    );
    };


export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedStatus, setSelectedStatus] = useState("");

  const [tasks, setTasks] = useState<Task[]>([]);
  const { getAllTasks } = useTask();

  // const tasks = useMemo(() => tasks, [tasks]); // DELETE ME
  // const statusTypes = useMemo(() => Array.from(new Set(tasksMemo.map((task) => task.status))), [tasksMemo]); // DELETE ME

  // Get all tasks from the API
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        const tasks = await getAllTasks();
        setTasks(tasks);
      } catch (error) {
        console.error("Error while fetching tasks", error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchTasks();
  }, []);

  const filteredTasks = useMemo(() => {
    if (!selectedStatus) {
      return tasks;
    }

    return tasks.filter((task) => task.status === selectedStatus);
  }, [tasks, selectedStatus]);

  return (
    <List 
    isLoading={isLoading}
    navigationTitle="Search Tasks"
    searchBarPlaceholder="Search your tasks"
    searchBarAccessory={
      <StatusDropdown tasks={tasks} onStatusChange={setSelectedStatus} />
      
    }
    >
      {filteredTasks?.map((task: Task) => (
        <List.Item 
          key={task.id} 
          title={task.title}
          keywords={task.notes.split(" ")} // Add notes to keywords so they are searchable
          icon={task.status == ARCHIVED_STATUS ? Icon.CheckCircle : task.status == COMPLETE_STATUS ? Icon.CircleProgress100 : Icon.Circle} // If task is archived, show checkmark, else show circle
          accessories={[
            { tag: { value: task.eventCategory, color: Color.PrimaryText } },
            { tag: { value: `${task.timeChunksRemaining / 4}h`, color: Color.Green }, tooltip: "Time remaining" },
            { tag: { value: new Date(task.snoozeUntil), color: Color.Yellow }, tooltip: "Snoozed until " + new Date(task.snoozeUntil).toLocaleString([], { dateStyle: "medium", timeStyle: "short"}) },
            { tag: { value: new Date(task.due).toLocaleString([], { dateStyle: "medium", timeStyle: "short"}), color: Color.Red }, tooltip: "Due date" , icon: Icon.Flag},
          ]}
        />
      ))}
    </List>
  );
};

// TODO: 
// -[x] Fix re-rendering issue
// -[x] Fix isLoading issue

// -[ ] Add ActionPanel to add time to task
// -[ ] Add ActionPanel to edit due date
