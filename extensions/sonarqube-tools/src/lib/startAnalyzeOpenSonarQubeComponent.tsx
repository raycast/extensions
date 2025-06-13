import { useState } from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useProjectLoader } from "../hooks/useProjectLoader";
import { useCommandSequencer } from "../hooks/useCommandSequencer";
import { ProjectListItem } from "../components/ProjectListItem";
import { ProjectForm } from "../components/ProjectForm";
import { Project, saveProject, generateId } from "../utils";
import { __ } from "../i18n";

/**
 * React component for the combined start, analyze, and open SonarQube command
 */
export function StartAnalyzeOpenSonarQubeComponent() {
  // Use our custom hooks to manage state and logic
  const { projects, isLoading, refreshProjects } = useProjectLoader();
  const { performStartAnalyzeSequence } = useCommandSequencer();

  // Local state to control the form visibility
  const [showForm, setShowForm] = useState(false);

  /**
   * Handler for when a user selects a project to analyze
   */
  const handleStartAnalyzeProject = async (projectPath: string, projectName: string) => {
    await performStartAnalyzeSequence(projectPath, projectName);
  };

  /**
   * Handle adding a new project
   */
  const handleAddProject = async (values: { name: string; path: string }) => {
    try {
      const newProject: Project = {
        id: generateId(),
        name: values.name,
        path: values.path,
      };

      await saveProject(newProject);
      await showToast({
        style: Toast.Style.Success,
        title: __("projects.form.saveSuccess"),
        message: newProject.name,
      });

      setShowForm(false);
      refreshProjects(); // Reload projects after adding
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: __("projects.form.saveError"),
        message: String(error),
      });
    }
  };

  // If showing the form
  if (showForm) {
    return <ProjectForm onSubmit={handleAddProject} />;
  }

  // Main list view
  return (
    <List
      isLoading={isLoading}
      navigationTitle={__("commands.allInOne.title")}
      searchBarPlaceholder={__("commands.runSonarAnalysis.searchPlaceholder")}
      actions={
        <ActionPanel>
          <Action title={__("projects.management.addProject")} icon={Icon.Plus} onAction={() => setShowForm(true)} />
        </ActionPanel>
      }
    >
      {/* Show empty view or projects list */}
      {projects.length === 0 && !isLoading ? (
        <List.EmptyView
          title={__("commands.runSonarAnalysis.noProjects")}
          description={__("commands.allInOne.configureFirst")}
          icon={Icon.Info}
          actions={
            <ActionPanel>
              <Action
                title={__("projects.management.addProject")}
                icon={Icon.Plus}
                onAction={() => setShowForm(true)}
              />
            </ActionPanel>
          }
        />
      ) : (
        projects.map((project) => (
          <ProjectListItem key={project.id} project={project} onStartAnalyze={handleStartAnalyzeProject} />
        ))
      )}
    </List>
  );
}
