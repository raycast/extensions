import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getActiveSession, getWorklogData, startSession } from "../utils";
import { Project } from "../types";

export default function Command() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Load the projects
        const data = await getWorklogData();
        setProjects(data.projects);

        // Check if there's an active session
        const active = await getActiveSession();
        if (active) {
          setActiveProject(active.project);
        }
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load data",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const handleStartSession = async (project: Project) => {
    try {
      setIsLoading(true);
      await startSession(project.id);
      setActiveProject(project);

      showToast({
        style: Toast.Style.Success,
        title: "Session Started",
        message: `Working session for ${project.name} has begun`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to start session",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects...">
      {activeProject ? (
        <List.Section title="Active Session">
          <List.Item
            icon={{ source: Icon.Circle, tintColor: "green" }}
            title={activeProject.name}
            subtitle="Currently active"
            accessories={[{ text: "Active", icon: Icon.Clock }]}
          />
        </List.Section>
      ) : null}

      <List.Section title="Available Projects">
        {projects.map((project) => (
          <List.Item
            key={project.id}
            icon={Icon.Box}
            title={project.name}
            subtitle={`ID: ${project.id}`}
            actions={
              <ActionPanel>
                <Action
                  title="Start Session"
                  icon={Icon.Play}
                  onAction={() => handleStartSession(project)}
                  // disabled={activeProject !== null}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
