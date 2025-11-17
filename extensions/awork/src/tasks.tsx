import { Action, ActionPanel, Icon, launchCommand, LaunchProps, LaunchType, List, LocalStorage } from "@raycast/api";
import { showFailureToast, useCachedPromise, usePromise } from "@raycast/utils";
import { useState } from "react";
import { getProjects, getTasks, task } from "./composables/FetchData";
import { getTokens } from "./composables/WebClient";

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
  let icon;
  switch (props.task.taskStatus.type) {
    case "todo":
      icon = "icon_todo.png";
      break;
    case "progress":
      icon = "icon_progress.png";
      break;
    case "stuck":
      icon = "icon_stuck.png";
      break;
    case "review":
      icon = "icon_review.png";
      break;
    case "done":
      icon = "icon_done.png";
      break;
    default:
      icon = Icon.Document;
  }
  if (props.task.taskStatus.icon === "circle_without_color") {
    icon = "icon_blank.png";
  }
  return (
    <List.Item
      icon={{ source: icon }}
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
  const { data: token, revalidate } = usePromise(getTokens, [], {
    onData: (data) => {
      if (!data || data.isExpired()) {
        revalidate();
      }
    },
  });
  const [searchText, setSearchText] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const {
    data: tasks,
    pagination,
    isLoading: isLoadingTasks,
    revalidate: updateTasks,
  } = useCachedPromise(getTasks, [token?.accessToken as string, searchText, 100, projectId], {
    execute: !!token?.accessToken && !token.isExpired(),
    onData: (data) => {
      if (data.length === 0 && !searchText) {
        updateTasks();
      }
    },
  });
  const {
    data: projects,
    isLoading: isLoadingProjects,
    revalidate: updateProjects,
  } = useCachedPromise(getProjects, [token?.accessToken as string, "", 1000], {
    execute: !!token?.accessToken && !token.isExpired(),
    onData: (data) => {
      if (data.length === 0) {
        updateProjects();
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
        Array.isArray(tasks) &&
        tasks
          .filter((task) => !projectId || task.projectId === projectId)
          .map((task) => <TaskItem key={task.id} task={task} />)}
    </List>
  );
}
