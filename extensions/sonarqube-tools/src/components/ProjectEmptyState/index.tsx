import { useState } from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { __ } from "../../i18n";
import { ProjectForm } from "../ProjectForm";
import { saveProject } from "../../utils/projectManagement";
import { generateId } from "../../utils";

/**
 * Component for showing an empty state when no projects are available
 * Extracted from the main component for better testability and reuse
 */
export function ProjectEmptyState() {
  // Local state to control the form visibility
  const [showAddForm, setShowAddForm] = useState(false);

  // Handle adding a new project directly
  const handleAddProject = async (values: { name: string; path: string }) => {
    try {
      // Generate a unique ID and save the project
      const newProject = {
        id: generateId(),
        name: values.name,
        path: values.path,
      };

      await saveProject(newProject);

      // Show success message
      await showToast({
        style: Toast.Style.Success,
        title: __("projects.form.saveSuccess"),
        message: newProject.name,
      });

      // Force reload of the current page to reflect the new project
      // This is a safer approach than navigation
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: __("projects.form.saveError"),
        message: String(error),
      });
    }
  };

  // If form is being shown, render the form
  if (showAddForm) {
    return <ProjectForm onSubmit={handleAddProject} />;
  }

  // Otherwise show the empty state with add project button
  return (
    <List.EmptyView
      key="empty-view"
      title={__("commands.runSonarAnalysis.noProjects")}
      description={__("commands.allInOne.configureFirst")}
      icon={Icon.Info}
      actions={
        <ActionPanel>
          <Action title={__("projects.management.addProject")} icon={Icon.Plus} onAction={() => setShowAddForm(true)} />
        </ActionPanel>
      }
    />
  );
}
