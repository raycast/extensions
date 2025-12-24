import React, { useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import path from "path";
import { getRelativeTime, loadProjects, openInAntigravity } from "./utils";
import { Project } from "./types";
import { usePromise } from "@raycast/utils";
import { homedir } from "os";

export default function Command() {
  const {
    data: projects,
    isLoading,
    error,
  } = usePromise(async () => {
    return await loadProjects();
  });

  useEffect(() => {
    if (error) {
      console.error("Error loading projects: ", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong: ",
        message: error.message,
      });
    }
  }, [error]);

  async function handleOpenProject(project: Project) {
    await openInAntigravity(project.path);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects...">
      {projects && projects.length > 0 ? (
        <List.Section title="Projects" subtitle={`${projects.length} projects`}>
          {projects.map((project) => (
            <List.Item
              key={project.path}
              title={project.name}
              subtitle={path.dirname(project.path).replace(homedir(), "~")}
              icon={{ fileIcon: project.path }}
              accessories={[
                {
                  text: getRelativeTime(project.lastModifiedTime),
                },
                {
                  icon: Icon.Folder,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Open with Antigravity"
                    icon={Icon.Rocket}
                    onAction={async () => await handleOpenProject(project)}
                  />
                  <Action.ShowInFinder path={project.path} />
                  <Action.CopyToClipboard
                    title="Copy Path"
                    content={project.path}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView
          title="No projects found"
          description="Check your projects directory in preferences"
          icon={Icon.Folder}
        />
      )}
    </List>
  );
}
