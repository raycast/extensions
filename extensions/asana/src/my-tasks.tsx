import { Action, ActionPanel, List } from "@raycast/api";
import { useState, useEffect } from "react";
import { groupBy, sortBy, uniqBy } from "lodash";
import { useMyTasks } from "./hooks/useMyTasks";
import { useWorkspaces } from "./hooks/useWorkspaces";
import withAsanaAuth from "./components/withAsanaAuth";
import TaskListItem from "./components/TaskListItem";
import CreateTaskForm from "./components/CreateTaskForm";
import { useMe } from "./hooks/useMe";

function MyTasks() {
  const [workspace, setWorkspace] = useState<string>();

  const { data: me } = useMe();
  const { data: workspaces, isLoading: isLoadingWorkspaces } = useWorkspaces();
  const { data: tasks, isLoading: isLoadingMyTasks, mutate: mutateList } = useMyTasks(workspace);

  useEffect(() => {
    if (workspaces?.length === 1) {
      setWorkspace(workspaces[0].gid);
    }
  }, [workspaces]);

  const tasksBySection = groupBy(tasks, "assignee_section.gid");
  const sections = uniqBy(
    tasks?.map((task) => task.assignee_section),
    "gid",
  ).map((section) => {
    const tasks = tasksBySection[section.gid];

    return {
      ...section,
      subtitle: tasks.length === 1 ? "1 task" : `${tasks.length} tasks`,
      tasks: sortBy(tasksBySection[section.gid], "due_on", "due_at"),
    };
  });

  return (
    <List
      searchBarPlaceholder="Filter by task name, project, section, or custom fields"
      isLoading={isLoadingWorkspaces || isLoadingMyTasks}
      {...(workspaces && workspaces.length > 1
        ? {
            searchBarAccessory: (
              <List.Dropdown tooltip="Change Workspace" onChange={setWorkspace} storeValue>
                {workspaces?.map((workspace) => (
                  <List.Dropdown.Item key={workspace.gid} value={workspace.gid} title={workspace.name} />
                ))}
              </List.Dropdown>
            ),
          }
        : {})}
    >
      <List.EmptyView
        title="No tasks"
        description="There are no tasks assigned to you."
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Issue"
              target={<CreateTaskForm assignee={me?.gid} workspace={workspace} fromEmptyView={true} />}
            />
          </ActionPanel>
        }
      />

      {tasks && tasks.length > 0
        ? sections.map((section) => {
            return (
              <List.Section key={section.gid} title={section.name} subtitle={section.subtitle}>
                {section.tasks.map((task) => {
                  return <TaskListItem key={task.gid} task={task} workspace={workspace} mutateList={mutateList} />;
                })}
              </List.Section>
            );
          })
        : null}
    </List>
  );
}

export default withAsanaAuth(MyTasks);
