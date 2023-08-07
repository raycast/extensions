import { Color, Icon, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import { useTask } from "./hooks/useTask";
import { Task } from "./types/task";

// TODO: 
// -[x] Change order of statusTypes to: Open, Done Scheduling, Marked Done
// -[ ] Add List.Section for each status type
// -[ ] Add ActionPanel to add time to task
// -[ ] Add ActionPanel to edit due date

// define status types
const NEW_STATUS = "NEW";
const SCHEDULED_STATUS = "SCHEDULED";
const IN_PROGRESS_STATUS = "IN_PROGRESS";
const COMPLETE_STATUS = "COMPLETE";
const ARCHIVED_STATUS = "ARCHIVED";

const OPEN_STATUS = "Open";
const DONE_STATUS = "Marked done";

// Dropdown Menu for Status types -> https://developers.raycast.com/api-reference/user-interface/list#list.dropdown
type StatusDropdownProps = {
  tasks: Task[];
  onStatusChange: (newValue: string) => void;
};

// const StatusDropdown = (props: StatusDropdownProps) => {
//   const { tasks, onStatusChange } = props;
//     const statusTypes = useMemo(() => Array.from(new Set(tasks.map((task) => task.status))), [tasks]); // using useMemo() to avoid re-rendering the list every time the status changes
    
//     // change order of statusTypes to: SCHEDULED, NEW, COMPLETE, ARCHIVED"
//     const statusOrder = [NEW_STATUS, SCHEDULED_STATUS, IN_PROGRESS_STATUS, COMPLETE_STATUS, ARCHIVED_STATUS];
//     statusTypes.sort((a, b) => statusOrder.indexOf(a) - statusOrder.indexOf(b));

//     return (
//       <List.Dropdown
//         tooltip="Select Status"
//         storeValue={true}
//         onChange={(newValue) => {
//           onStatusChange(newValue ?? "");
//         }}
//       >
//         {statusTypes.map((statusType) => (
//           <List.Dropdown.Item
//           key={statusType}
//           title={statusType}
//           // title={statusType === "ARCHIVED" ? "Marked done" : statusType === "COMPLETE" ? "Completed" : "Open"}
//           value={statusType} />
//         ))}
//       </List.Dropdown>
//     );
//     };

const StatusDropdown = (props: StatusDropdownProps) => {
  const { tasks, onStatusChange } = props;
  const statusTypes = useMemo(() => [OPEN_STATUS, DONE_STATUS], []); // define status types

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
          title={statusType}
          value={statusType}
        />
      ))}
    </List.Dropdown>
  );
};

function TaskList() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");

  const [tasks, setTasks] = useState<Task[]>([]);
  const { getAllTasks } = useTask();

  // Get all tasks via the API
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

  // // Filter tasks by status
  // const filteredTasks = useMemo(() => {
  //   if (!selectedStatus) {
  //     return tasks;
  //   }

  //   if (selectedStatus === "Open") {
  //     return tasks.filter(
  //       (task) =>
  //         task.status === NEW_STATUS ||
  //         task.status === SCHEDULED_STATUS ||
  //         task.status === IN_PROGRESS_STATUS ||
  //         task.status === COMPLETE_STATUS
  //     );
  //   } else if (selectedStatus === "Marked done") {
  //     return tasks.filter(
  //       (task) => 
  //       task.status === ARCHIVED_STATUS);
  //   }

  //   return tasks.filter((task) => task.status === selectedStatus);
  // }, [tasks, selectedStatus]);

// Filter tasks by status
const filteredTasks = useMemo(() => {
  if (selectedStatus === DONE_STATUS) {
    return tasks.filter((task) => task.status === ARCHIVED_STATUS);
  } else if (selectedStatus === OPEN_STATUS) {
    return tasks.filter(
      (task) =>
        task.status === NEW_STATUS ||
        task.status === SCHEDULED_STATUS ||
        task.status === IN_PROGRESS_STATUS ||
        task.status === COMPLETE_STATUS
    );
  } else {
    return tasks.filter((task) => task.status === selectedStatus);
  }
}, [tasks, selectedStatus]);

  // Get number of tasks for section subtitle
  // const numberOfTasks = filteredTasks?.length === 1 ? "1 task" : `${filteredTasks?.length} tasks`;

  // Group tasks by status
  const groupedTasks = useMemo(() => {
    const groups: { [key: string]: Task[] } = {};

    filteredTasks.forEach((task) => {
      if (!groups[task.status]) {
        groups[task.status] = [];
      }

      groups[task.status].push(task);
    });

    return groups;
  }, [filteredTasks]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Search Tasks"
      searchBarPlaceholder="Search tasks"
      searchBarAccessory={
        <StatusDropdown tasks={tasks} onStatusChange={setSelectedStatus} />
      }
    >
      {Object.entries(groupedTasks).map(([status, tasks]) => (
        <List.Section
          key={status}
          title={status}
          subtitle={`${tasks.length} tasks`}
        >
          {tasks.map((task: Task) => (
            <List.Item
              key={task.id}
              keywords={task.notes.split(" ")}
              icon={
                task.status === ARCHIVED_STATUS
                  ? Icon.CheckCircle
                  : task.status === COMPLETE_STATUS
                  ? Icon.CircleProgress100
                  : Icon.Circle
              }
              title={task.title}
              accessories={[
                // Snooze until
                task.status !== ARCHIVED_STATUS && task.snoozeUntil && {
                    tag: {
                      value: new Date(task.snoozeUntil),
                      color: Color.Yellow,
                    },
                    tooltip:
                      "Snoozed until " + new Date(task.snoozeUntil).toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }),
                  },
                // Time spent if task is archived
                task.status === ARCHIVED_STATUS && {
                  tag: {
                    value: `${task.timeChunksSpent / 4}h`,
                    color: Color.PrimaryText,
                  },
                  tooltip: "Time spent",
                },
                // Time remaining
                task.status !== ARCHIVED_STATUS && task.timeChunksRemaining && {
                    tag: {
                      value:
                        task.timeChunksRemaining >= 4
                          ? 0.25 * task.timeChunksRemaining + "h"
                          : 15 * task.timeChunksRemaining + "min",
                      color: Color.Green,
                    },
                    tooltip: "Time left",
                    icon: Icon.Stopwatch,
                  },
                // Due date
                task.due && {
                  tag: {
                    value: new Date(task.due),
                    color: Color.Red,
                  },
                  tooltip:
                    "Due date " + new Date(task.due).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }),
                  icon: Icon.Flag,
                },
              ].filter(Boolean)}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

// // define function to search and list tasks
// function TaskList() {
//   const [isLoading, setIsLoading] = useState(false);
  
//   const [selectedStatus, setSelectedStatus] = useState("");

//   const [tasks, setTasks] = useState<Task[]>([]);
//   const { getAllTasks } = useTask();

//   // Get all tasks via the API
//   useEffect(() => {
//     const fetchTasks = async () => {
//       try {
//         setIsLoading(true);
//         const tasks = await getAllTasks();
//         setTasks(tasks);
//       } catch (error) {
//         console.error("Error while fetching tasks", error);
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     void fetchTasks();
//   }, []);

//   // Filter tasks by status
//   const filteredTasks = useMemo(() => {
//     if (!selectedStatus) {
//       return tasks;
//     }

//     return tasks.filter((task) => task.status === selectedStatus);
//   }, [tasks, selectedStatus]);

//   // Get number of tasks
//   const numbeOfTasks = filteredTasks?.length === 1 ? "1 task" : `${filteredTasks?.length} tasks`; // get number of tasks

//   return (
//     <List 
//     isLoading={isLoading}
//     navigationTitle="Search Tasks"
//     searchBarPlaceholder="Search tasks"
//     searchBarAccessory={
//       <StatusDropdown tasks={tasks} onStatusChange={setSelectedStatus} />
//     }
//     >
//       <List.Section title={selectedStatus} subtitle={numbeOfTasks}>
//       {filteredTasks?.map((task: Task) => (
//         <List.Item 
//           key={task.id} 
//           keywords={task.notes.split(" ")} // Add notes to keywords so they are searchable
//           icon={task.status == ARCHIVED_STATUS ? Icon.CheckCircle : task.status == COMPLETE_STATUS ? Icon.CircleProgress100 : Icon.Circle} // If task is archived, show checkmark, else show circle
//           title={task.title}
//           accessories={[
//             task.status !== ARCHIVED_STATUS && // If task is ARCHIVED, don't show snoozeUntil
//             { tag: { value: new Date(task.snoozeUntil), color: Color.Yellow }, 
//             tooltip: "Snoozed until " + new Date(task.snoozeUntil).toLocaleString([], { dateStyle: "medium", timeStyle: "short"}) },

//             task.status === ARCHIVED_STATUS && // If task is ARCHIVED, show time spent in gray
//             { tag: { value: `${task.timeChunksSpent / 4}h`, color: Color.PrimaryText }, 
//             tooltip: "Time spent" },

//             task.status !== ARCHIVED_STATUS && // If task is ARCHIVED, don't show time remaining
//             // { tag: { value: `${task.timeChunksRemaining / 4}h`, color: Color.Green }, tooltip: "Time remaining" },
//             { tag: { value: `${task.timeChunksRemaining >= 4 ? 0.25*task.timeChunksRemaining + "h" : 15*task.timeChunksRemaining + "min"}`, color: Color.Green }, 
//             tooltip: "Time remaining "},

//             { tag: { value: new Date(task.due), color: Color.Red }, 
//             tooltip: "Due date " + new Date(task.due).toLocaleString([], { dateStyle: "medium", timeStyle: "short"}), 
//             icon: Icon.Flag},
          
//           ].filter(Boolean)} // filter out any accessories that are undefined
//         />
//       ))}
//       </List.Section>
//     </List>
//   );
// };

export default function Command() {
  return <TaskList />;
}
