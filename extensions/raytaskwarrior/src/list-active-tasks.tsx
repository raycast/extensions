import { showToast, Toast, List, popToRoot, Action, ActionPanel } from "@raycast/api";
import { useState, useEffect } from "react";
import { deleteTask, getActiveTasks, getAllProjects, getTasksForProject, markTaskAsDone, updateTask } from "./api";
import ProjectsDropdown from "./components/ProjectsDropdown";
import { Task } from "./types/types";
import Details from "./components/Details";
import AddTaskAdvanced from "./addTaskAdvanced";

const ListActiveTabs = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Set<string>>(new Set([]));

  useEffect(() => {
    getTasks();
    getProjects();
  }, []);

  const showCustomToast = async (title: string, style: Toast.Style, message: string) => {
    await showToast({
      title: title,
      style: style,
      message: message,
    });
  };

  const getTasks = async () => {
    try {
      const data = await getActiveTasks();
      setTasks(data);
    } catch (error) {
      showCustomToast("Error", Toast.Style.Failure, `${error}`);
      popToRoot();
    }
  };

  const getProjects = async () => {
    try {
      const data = await getAllProjects();
      setProjects(data);
    } catch (error) {
      showCustomToast("Error", Toast.Style.Failure, `${error}`);
    }
  };

  const filterByProject = async (project: string) => {
    if (project === "All") {
      getTasks();
    } else {
      try {
        console.log(`project changed to ${project}`);
        const data = await getTasksForProject(project);
        console.log(data);
        setTasks(data);
      } catch (error) {
        showCustomToast("Error", Toast.Style.Failure, `${error}`);
      }
    }
  };

  const markTaskAsDoneAndUpdateList = async (taskUuid: string) => {
    await markTaskAsDone(taskUuid);
    getTasks();
    showCustomToast("Success", Toast.Style.Success, "Task marked as done");
  };

  const onProjectChange = (newValue: string) => {
    filterByProject(newValue);
  };

  const deleteAndUpdateList = async (uuid: string) => {
    await deleteTask(uuid);
    getTasks();
    showCustomToast("Success", Toast.Style.Success, "Task Deleted");
  };

  const startOrStopTask = async (task: Task) => {
    const action = task.tags && Array.from(task.tags).includes("next") ? "-next" : "+next";
    await updateTask(task.uuid, undefined, undefined, [action]);
    getTasks();
  };

  return (
    <List
      navigationTitle="Tasks"
      searchBarAccessory={<ProjectsDropdown projects={projects} onProjectChange={onProjectChange} />}
    >
      {tasks.length === 0 ? (
        <List.EmptyView
          title="No Tasks Found"
          description="make sure you have added at least one task."
          actions={
            <ActionPanel>
              <Action.Push key="newTask" title="Add a New Task" target={<AddTaskAdvanced />} />
            </ActionPanel>
          }
        />
      ) : (
        tasks.map((task) => (
          <List.Item
            id={task.uuid}
            keywords={[task.tags ? [...task.tags].join(" ") : "", task.project || ""]}
            title={task.description}
            key={task.uuid}
            accessories={[{ text: task.project }]}
            actions={
              <ActionPanel>
                <Action.Push key="Details" title="Details" target={<Details task={task} />} />
                <Action title="Mark as Done" onAction={() => markTaskAsDoneAndUpdateList(task.uuid)} />
                <Action
                  key="start"
                  title={task.tags && Array.from(task.tags).includes("next") ? "Stop" : "Start"}
                  shortcut={{ modifiers: ["ctrl"], key: "s" }}
                  onAction={() => startOrStopTask(task)}
                />
                <Action
                  key="delete"
                  title="Delete"
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => deleteAndUpdateList(task.uuid)}
                />
                <Action.Push
                  key="new"
                  title="Add New Task"
                  target={<AddTaskAdvanced />}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
};

export default ListActiveTabs;
