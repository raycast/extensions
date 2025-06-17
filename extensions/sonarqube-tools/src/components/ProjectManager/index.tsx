import { ActionPanel, Action, List, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useProjectLoader } from "../../hooks/useProjectLoader";
import { __ } from "../../i18n";
import { Project, saveProject, deleteProject } from "../../utils/projectManagement";
import { ProjectForm } from "../ProjectForm";

/**
 * ProjectManager - Component for managing SonarQube projects
 */
export function ProjectManager() {
  const { projects, isLoading, error, refreshProjects } = useProjectLoader();
  const navigation = useNavigation();

  // Function to handle project save
  const handleSaveProject = async (values: { name: string; path: string }, projectId?: string) => {
    try {
      await saveProject({
        id: projectId || Math.random().toString(36).substring(2, 9),
        name: values.name,
        path: values.path,
      });
      await showToast({
        style: Toast.Style.Success,
        title: __("projects.form.saveSuccess"),
      });
      // Trigger refresh of project list
      refreshProjects();
    } catch (err) {
      showFailureToast(err, { title: __("projects.form.saveError") });
    }
  };

  // Function to handle project deletion
  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      await showToast({
        style: Toast.Style.Success,
        title: __("projects.form.deleteSuccess"),
      });
      // Trigger refresh of project list
      refreshProjects();
    } catch (err) {
      showFailureToast(err, { title: __("projects.form.deleteError") });
    }
  };

  // Show an error screen if there was an error loading projects
  if (error) {
    return (
      <List isLoading={false} searchBarPlaceholder={__("commands.runSonarAnalysis.searchPlaceholder")}>
        <List.EmptyView
          title={__("common.error")}
          description={String(error)}
          icon={Icon.Warning}
          actions={
            <ActionPanel>
              <Action title={__("common.retry")} onAction={() => refreshProjects()} icon={Icon.RotateClockwise} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Add project handler - wraps project form in a function to avoid direct component passing
  const addProject = () => {
    const FormWrapper = () => {
      const handleSubmit = (values: { name: string; path: string }) => {
        handleSaveProject(values);
        // Refresh projects to reload data
        refreshProjects();
      };

      return <ProjectForm onSubmit={handleSubmit} />;
    };

    // Navigate to the form wrapper
    navigation.push(<FormWrapper />);
  };

  // Edit project handler
  const editProject = (project: Project) => {
    const FormWrapper = () => {
      const handleSubmit = (values: { name: string; path: string }) => {
        handleSaveProject(values, project.id);
        // Refresh projects to reload data
        refreshProjects();
      };

      return <ProjectForm project={project} onSubmit={handleSubmit} />;
    };

    navigation.push(<FormWrapper />);
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder={__("commands.runSonarAnalysis.searchPlaceholder")}>
      {/* Projects section */}
      <List.Section title={__("projects.management.title")}>
        {projects.length > 0 ? (
          projects.map((project: Project) => (
            <List.Item
              key={project.id}
              title={project.name}
              subtitle={project.path}
              accessories={[{ icon: { source: Icon.Folder }, text: project.path }]}
              actions={
                <ActionPanel>
                  <Action
                    title={__("projects.management.editProject")}
                    icon={Icon.Pencil}
                    onAction={() => editProject(project)}
                  />
                  <Action
                    title={__("projects.management.deleteProject")}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDeleteProject(project.id)}
                  />
                </ActionPanel>
              }
            />
          ))
        ) : (
          <List.EmptyView
            title={__("commands.runSonarAnalysis.noProjects")}
            description={__("commands.allInOne.configureFirst")}
            icon={Icon.Info}
            actions={
              <ActionPanel>
                <Action title={__("projects.management.addProject")} icon={Icon.Plus} onAction={addProject} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      {/* Actions section */}
      <List.Section title={__("projects.management.actions")}>
        <List.Item
          title={__("projects.management.addProject")}
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action title={__("projects.management.addProject")} icon={Icon.Plus} onAction={addProject} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
