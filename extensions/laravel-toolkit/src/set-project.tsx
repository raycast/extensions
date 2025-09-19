import { List, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { getProjects, setActiveProject, getActiveProject } from "../lib/projectStore";

export default function Command() {
  const [projects, setProjects] = useState<Record<string, string>>({});
  const [activeProject, setActiveProjectState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getProjects().then(setProjects), getActiveProject().then(setActiveProjectState)])
      .catch((error) => {
        console.error("Failed to load projects:", error);
        setError(error instanceof Error ? error.message : "Failed to load projects");
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load projects",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  if (error) {
    return (
      <List>
        <List.EmptyView title="Error Loading Projects" description={error} icon={Icon.ExclamationMark} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter projects..." navigationTitle="Laravel Projects">
      {Object.entries(projects).map(([name, path]) => {
        const isActive = activeProject === path;
        return (
          <List.Item
            key={name}
            title={isActive ? `⭐ ${name}` : name}
            subtitle={path}
            icon={isActive ? Icon.CheckCircle : Icon.Circle}
            accessories={isActive ? [{ text: "CURRENTLY ACTIVE", icon: Icon.Star }] : undefined}
            actions={
              <ActionPanel>
                <Action
                  title="Set as Active Project"
                  onAction={async () => {
                    try {
                      await setActiveProject(path);
                      setActiveProjectState(path);
                      await showToast({
                        style: Toast.Style.Success,
                        title: `Set "${name}" as active project`,
                      });
                    } catch (error) {
                      console.error("Failed to set active project:", error);
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to set active project",
                        message: error instanceof Error ? error.message : "Unknown error occurred",
                      });
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
      {Object.keys(projects).length === 0 && !isLoading && (
        <List.EmptyView
          title="No Projects Found"
          description="Use 'Laravel: Add Project' to add your first project"
          icon={Icon.Folder}
        />
      )}
    </List>
  );
}
