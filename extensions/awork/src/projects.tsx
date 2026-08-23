import { Action, ActionPanel, Icon, launchCommand, LaunchType, List, LocalStorage } from "@raycast/api";
import { showFailureToast, useCachedPromise, usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getProjects, project } from "./composables/FetchData";
import { getTokens, onTokenChange } from "./composables/WebClient";

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
        shortcut={{
          macOS: { modifiers: ["ctrl"], key: "e" },
          Windows: { modifiers: ["ctrl"], key: "e" },
        }}
      />
      <Action
        icon={Icon.Clock}
        title="Log Time"
        shortcut={{
          macOS: { modifiers: ["ctrl", "cmd"], key: "enter" },
          Windows: { modifiers: ["ctrl", "windows"], key: "enter" },
        }}
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
            showFailureToast(error, { title: "Failed to launch time logging" });
          }
        }}
      />
      <Action
        icon={Icon.Plus}
        title="Create Task"
        shortcut={{
          macOS: { modifiers: ["ctrl"], key: "c" },
          Windows: { modifiers: ["ctrl"], key: "c" },
        }}
        onAction={async () => {
          try {
            await launchCommand({
              name: "createTask",
              type: LaunchType.UserInitiated,
              context: {
                projectId: props.projectID,
              },
            });
          } catch (error) {
            showFailureToast("Failed to launch task creation", error as Error);
          }
        }}
      />
      <Action
        icon={Icon.BulletPoints}
        title={"Show Project Tasks"}
        shortcut={{
          macOS: { modifiers: ["ctrl"], key: "enter" },
          Windows: { modifiers: ["ctrl"], key: "enter" },
        }}
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
            showFailureToast(error, { title: "Failed to launch tasks" });
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
      accessories={[{ text: props.project.projectKey }]}
      actions={<Actions projectID={props.project.id} isBillable={props.project.isBillableByDefault} />}
    />
  );
};

export default function Command() {
  const { data: token, revalidate: revalidateToken } = usePromise(getTokens);

  useEffect(() => {
    return onTokenChange(revalidateToken);
  }, [revalidateToken]);
  const [searchText, setSearchText] = useState<string>("");
  const {
    data: projects,
    isLoading,
    pagination,
  } = useCachedPromise(getProjects, [token?.accessToken as string, searchText, 100], {
    execute: !!token?.accessToken && !token.isExpired(),
  });

  return (
    <List isLoading={isLoading} pagination={pagination} throttle onSearchTextChange={setSearchText}>
      {projects && projects.map((project) => <ProjectItem key={project.id} project={project} />)}
    </List>
  );
}
