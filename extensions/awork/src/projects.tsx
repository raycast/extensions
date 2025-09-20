import { Action, ActionPanel, Icon, launchCommand, LaunchType, List, LocalStorage } from "@raycast/api";
import { showFailureToast, useCachedPromise, usePromise } from "@raycast/utils";
import { useState } from "react";
import { getProjects, project } from "./composables/FetchData";
import { getTokens } from "./composables/WebClient";

const Actions = (props: { projectID: string; isBillable: boolean }) => {
  const { data: BaseUrl } = useCachedPromise(() => LocalStorage.getItem<string>("URL"));

  return (
    <ActionPanel>
      <Action.OpenInBrowser url={`${BaseUrl}/projects/${props.projectID}`} />
      <Action.CopyToClipboard title={"Copy URL to Clipboard"} content={`${BaseUrl}/projects/${props.projectID}`} />
      <Action.CopyToClipboard
        icon={Icon.Envelope}
        title="Copy Project Mail Address"
        content={`project-${props.projectID}@hello.awork.com`}
        shortcut={{ modifiers: ["ctrl"], key: "e" }}
      />
      <Action
        icon={Icon.Clock}
        title="Log Time"
        shortcut={{ modifiers: ["cmd", "ctrl"], key: "enter" }}
        onAction={async () => {
          try {
            await launchCommand({
              name: "logTime",
              type: LaunchType.UserInitiated,
              context: {
                projectId: props.projectID,
                isBillable: props.isBillable,
              },
            });
          } catch (error) {
            showFailureToast("Failed to launch time logging", error as Error);
          }
        }}
      />
      <Action
        icon={Icon.BulletPoints}
        title={"Show Tasks"}
        shortcut={{ modifiers: ["ctrl"], key: "enter" }}
        onAction={async () => {
          try {
            await launchCommand({
              name: "tasks",
              type: LaunchType.UserInitiated,
              context: {
                projectId: props.projectID,
              },
            });
          } catch (error) {
            showFailureToast("Failed to launch tasks", error as Error);
          }
        }}
      />
    </ActionPanel>
  );
};

const ProjectItem = (props: { project: project }) => {
  let icon;
  switch (props.project.projectStatus.type) {
    case "not-started":
      icon = "icon_todo.png";
      break;
    case "progress":
      icon = "icon_progress.png";
      break;
    case "stuck":
      icon = "icon_stuck.png";
      break;
    case "closed":
      icon = "icon_done.png";
      break;
    default:
      icon = Icon.Folder;
  }
  return (
    <List.Item
      icon={{ source: icon }}
      title={props.project.name}
      subtitle={props.project.company?.name}
      actions={<Actions projectID={props.project.id} isBillable={props.project.isBillableByDefault} />}
    />
  );
};

export default function Command() {
  const { data: token, revalidate } = usePromise(getTokens, [], {
    onData: (data) => {
      if (!data || data.isExpired()) {
        revalidate();
      }
    },
  });
  const [searchText, setSearchText] = useState<string>("");
  const {
    data: projects,
    isLoading,
    pagination,
    revalidate: updateSearch,
  } = useCachedPromise(getProjects, [token?.accessToken as string, searchText, 100], {
    execute: !!token?.accessToken && !token.isExpired(),
    onData: (data) => {
      if (!data || (data.length === 0 && !searchText)) {
        updateSearch();
      }
    },
  });

  return (
    <List isLoading={isLoading} pagination={pagination} throttle onSearchTextChange={setSearchText}>
      {projects && projects.map((project) => <ProjectItem key={project.id} project={project} />)}
    </List>
  );
}
