import { Action, ActionPanel, Icon, Keyboard, List, closeMainWindow } from "@raycast/api";
import { showFailureToast, useSQL } from "@raycast/utils";
import { Project, WORKSPACES_QUERY, WorkspaceRow, databasePath, openInWu, toProject } from "./wu";

export default function Command() {
  const { data, isLoading, error, permissionView } = useSQL<WorkspaceRow>(databasePath(), WORKSPACES_QUERY, {
    permissionPriming: "Required to read the list of projects you opened in Wu.",
  });

  if (permissionView) {
    return permissionView;
  }

  const projects = (data ?? []).map(toProject).filter((project): project is Project => project !== undefined);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search recent projects">
      <List.EmptyView
        icon={Icon.Folder}
        title={error ? "Could not read Wu's project list" : "No recent projects"}
        description={error ? error.message : "Projects you open in Wu will show up here."}
      />
      {projects.map((project) => (
        <List.Item
          key={project.id}
          icon={{ fileIcon: project.paths[0] }}
          title={project.title}
          subtitle={project.subtitle}
          keywords={project.paths.flatMap((path) => path.split("/"))}
          accessories={
            Number.isNaN(project.lastOpened.getTime())
              ? []
              : [{ date: project.lastOpened, tooltip: project.lastOpened.toLocaleString() }]
          }
          actions={
            <ActionPanel>
              <Action title="Open in Wu" icon={Icon.AppWindow} onAction={() => openProject(project, false)} />
              <Action
                title="Open in New Window"
                icon={Icon.NewDocument}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={() => openProject(project, true)}
              />
              <Action.ShowInFinder path={project.paths[0]} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
              <Action.CopyToClipboard
                title="Copy Path"
                content={project.paths.join("\n")}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function openProject(project: Project, newWindow: boolean) {
  try {
    await closeMainWindow();
    await openInWu(project.paths, newWindow);
  } catch (error) {
    await showFailureToast(error, { title: "Could not open project in Wu" });
  }
}
