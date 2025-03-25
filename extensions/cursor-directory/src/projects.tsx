import { List, ActionPanel, Action, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import path from "path";
import { applyCursorRule, ensureCursorRulesFile, getRelativeTime, loadProjects, openInCursor } from "./utils";
import { Project } from "./types";
import { usePromise } from "@raycast/utils";
import { homedir } from "os";
import { OpenPrefAction } from "./components/actions/OpenPrefAction";

export default function Command(
  props: LaunchProps<{
    launchContext: { cursorDirectory?: { ruleName: string; ruleContent: string; replace?: boolean } };
  }>,
) {
  const { cursorDirectory } = props.launchContext ?? {};

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
    await showHUD("Opening project...");
    await openInCursor(project.path, "Project opened successfully");

    console.debug("path: ", project.path);

    if (cursorDirectory && cursorDirectory.ruleContent) {
      console.debug("Applying cursor rule");
      await ensureCursorRulesFile(project.path);
      console.debug("ruleName: ", cursorDirectory.ruleName);
      await applyCursorRule(
        project.path,
        cursorDirectory.ruleName,
        cursorDirectory.ruleContent,
        cursorDirectory.replace ?? true,
      );
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter projects by name...">
      {projects ? (
        <List.Section title="Recent Projects" subtitle={`${projects.length} projects`}>
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
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Actions">
                    <Action title="Open Project" onAction={async () => await handleOpenProject(project)} />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Settings">
                    <OpenPrefAction />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView title="No projects found" />
      )}
    </List>
  );
}
