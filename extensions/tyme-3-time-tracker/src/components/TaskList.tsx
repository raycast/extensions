import { Action, ActionPanel, Icon, List, showHUD, closeMainWindow } from "@raycast/api";
import { useState, useCallback, useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
import { Project, Task, getTasksForProject, startTrackingTask } from "../tasks";
import { showErrorHUD } from "../utils";
import { CreateTask } from "./CreateTask";

interface TaskListProps {
  project: Project;
}

export function TaskList({ project }: TaskListProps) {
  const [searchText, setSearchText] = useState("");

  const { data: tasks = [], isLoading } = useCachedPromise(getTasksForProject, [project.id], {
    keepPreviousData: true,
    onError: (error) => showErrorHUD("loading tasks", error),
  });

  const handleStartTracking = useCallback(async (task: Task) => {
    try {
      const success = await startTrackingTask(task.id);
      if (success) {
        await showHUD(`Started tracking "${task.name}"`);
        closeMainWindow();
      } else {
        await showHUD("Failed to start tracking");
      }
    } catch (error) {
      await showErrorHUD("starting tracking", error);
    }
  }, []);

  const renderSubtaskItem = (subtask: Task) => (
    <List.Item
      key={subtask.id}
      title={subtask.name}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Start Tracking"
              icon={Icon.Play}
              onAction={() => handleStartTracking(subtask)}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );

  const filteredTasks = useMemo(() => {
    return tasks
      .map((task) => ({
        ...task,
        subtasks: task.subtasks?.filter((subtask) => subtask.name.toLowerCase().includes(searchText.toLowerCase())),
      }))
      .filter(
        (task) =>
          task.name.toLowerCase().includes(searchText.toLowerCase()) || (task.subtasks && task.subtasks.length > 0)
      );
  }, [tasks, searchText]);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Search or create a task in ${project.name}...`}
      navigationTitle={project.name}
    >
      {filteredTasks.map((task) =>
        task.hasSubtasks ? (
          <List.Section key={task.id} title={task.name}>
            {task.subtasks?.map(renderSubtaskItem)}
          </List.Section>
        ) : (
          <List.Item
            key={task.id}
            title={task.name}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Start Tracking"
                    icon={Icon.Play}
                    onAction={() => handleStartTracking(task)}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        )
      )}
      <List.EmptyView
        title={searchText.trim() ? `Create task "${searchText}"` : "No Tasks Found"}
        description={searchText.trim() ? "Press Enter to create this task" : "Type to search or create a new task"}
        icon={searchText.trim() ? Icon.PlusCircle : Icon.List}
        actions={
          <ActionPanel>
            {searchText.trim() && (
              <Action.Push
                title="Create Task"
                icon={Icon.PlusCircle}
                target={<CreateTask project={project} name={searchText} />}
                shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
              />
            )}
          </ActionPanel>
        }
      />
    </List>
  );
}
