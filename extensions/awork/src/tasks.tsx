import { Action, ActionPanel, Icon, launchCommand, LaunchProps, LaunchType, List, LocalStorage } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getProjects, getTasks, task } from "./composables/FetchData";
import { authorizationInProgress } from "./composables/WebClient";

const Actions = (props: { taskId: string; projectId: string; typeOfWorkId: string | undefined }) => {
  const { data: BaseUrl } = useCachedPromise(() => LocalStorage.getItem<string>("URL"));

  return (
    <ActionPanel>
      <Action.OpenInBrowser url={`${BaseUrl}/tasks/${props.taskId}`} />
      <Action.CopyToClipboard title={"Copy URL to Clipboard"} content={`${BaseUrl}/tasks/${props.taskId}`} />
      <Action.CopyToClipboard
        title={"Copy Task ID"} // eslint-disable-line
        content={props.taskId}
        shortcut={{ modifiers: ["ctrl"], key: "i" }}
      />
      <Action
        icon={Icon.Clock}
        title="Log Time"
        shortcut={{ modifiers: ["ctrl", "cmd"], key: "enter" }}
        onAction={async () => {
          try {
            await launchCommand({
              name: "logTime",
              type: LaunchType.UserInitiated,
              context: {
                taskId: props.taskId,
                projectId: props.projectId,
                typeOfWorkId: props.typeOfWorkId,
              },
            });
          } catch (error) {
            showFailureToast("Failed to launch time logging", error as Error);
          }
        }}
      />
    </ActionPanel>
  );
};

const TaskItem = (props: { task: task }) => {
  return (
    <List.Item
      icon={Icon.Document}
      title={props.task.name}
      subtitle={props.task.project.name}
      keywords={[props.task.project.name, props.task.id]}
      actions={
        <Actions taskId={props.task.id} projectId={props.task.projectId} typeOfWorkId={props.task.typeOfWorkId} />
      }
    />
  );
};

export default function Command(props: LaunchProps) {
  const [searchText, setSearchText] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const {
    data: tasks,
    pagination,
    isLoading: isLoadingTasks,
    revalidate: updateTasks,
  } = useCachedPromise(getTasks, [searchText, 100, projectId], {
    onData: (data) => {
      if (data.length === 0 && !searchText && !authorizationInProgress) {
        setTimeout(() => {
          console.log("Reloading tasks");
          updateTasks();
        }, 500);
      }
    },
  });
  const {
    data: projects,
    isLoading: isLoadingProjects,
    revalidate: updateProjects,
  } = useCachedPromise(getProjects, ["", 1000], {
    onData: (data) => {
      if (data.length === 0 && !authorizationInProgress) {
        setTimeout(() => {
          console.log("Reloading projects");
          updateProjects();
        }, 500);
      }
      if (props.launchContext?.projectId) {
        setProjectId(props.launchContext.projectId);
      }
    },
  });

  return (
    <List
      isLoading={isLoadingTasks}
      throttle
      pagination={pagination}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          isLoading={isLoadingProjects}
          tooltip={"Filter by project"}
          value={projectId}
          onChange={(newValue) => setProjectId(newValue)}
        >
          <List.Dropdown.Item title="All" value="" key="all" />
          {projects &&
            Array.isArray(projects) &&
            projects.map((project) => <List.Dropdown.Item title={project.name} value={project.id} key={project.id} />)}
        </List.Dropdown>
      }
    >
      {tasks &&
        tasks
          .filter((task) => !projectId || task.projectId === projectId)
          .map((task) => <TaskItem key={task.id} task={task} />)}
    </List>
  );
}
