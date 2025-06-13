import {
  getPreferenceValues,
  showToast,
  Toast,
  List,
  ActionPanel,
  Action,
  Icon,
  useNavigation,
  confirmAlert,
  Keyboard,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import {
  Preferences,
  runInNewTerminal,
  Project,
  loadProjects,
  saveProjects,
  generateId,
  fetchSonarQubeResults,
} from "../utils";
// __ is imported via useTranslation below
import useTranslation from "../i18n/useTranslation";

import ProjectForm from "../components/ProjectForm";
import AnalysisResultsView from "../components/AnalysisResultsView";
import { interpretAnalysisResults } from "../lib/aiService";

const DEFAULT_SONARQUBE_PORT = "9000";

/**
 * React component for the SonarQube analysis command
 */
export function RunSonarAnalysisComponent() {
  const { push } = useNavigation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const preferences = getPreferenceValues<Preferences>();
  const { __ } = useTranslation(); // Use our translation hook

  // Load projects on initial mount
  useEffect(() => {
    async function fetchProjects() {
      setIsLoading(true);
      setProjects(await loadProjects());
      setIsLoading(false);
    }
    fetchProjects();
  }, []);

  // --- CRUD Handlers ---
  const handleAddProject = useCallback(
    async (values: { name: string; path: string }) => {
      const newProject: Project = { ...values, id: generateId() };
      const updatedProjects = [...projects, newProject];
      setProjects(updatedProjects);
      await saveProjects(updatedProjects);
      await showToast({
        style: Toast.Style.Success,
        title: __("projects.form.saveSuccess"),
        message: newProject.name,
      });
    },
    [projects, __],
  );

  const handleEditProject = useCallback(
    async (id: string, values: { name: string; path: string }) => {
      const updatedProjects = projects.map((p) => (p.id === id ? { ...p, ...values } : p));
      setProjects(updatedProjects);
      await saveProjects(updatedProjects);
      await showToast({
        style: Toast.Style.Success,
        title: __("projects.form.saveSuccess"),
        message: values.name,
      });
    },
    [projects, __],
  );

  const handleDeleteProject = useCallback(
    async (id: string) => {
      if (
        await confirmAlert({
          title: __("projects.management.deleteProject"),
          message: __("projects.management.confirmDelete"),
        })
      ) {
        const updatedProjects = projects.filter((p) => p.id !== id);
        setProjects(updatedProjects);
        await saveProjects(updatedProjects);
        await showToast({
          style: Toast.Style.Success,
          title: __("projects.form.deleteSuccess"),
        });
      }
    },
    [projects, __],
  );

  // --- Analysis Action ---
  const performAnalysis = useCallback(
    async (projectPath: string, projectName: string) => {
      // Determine the SonarQube target path using the simplified preference structure
      let targetOpenPath: string;
      let serverUrl: string;

      // If app path is specified, use that directly
      if (preferences.sonarqubeAppPath && preferences.sonarqubeAppPath.trim() !== "") {
        targetOpenPath = preferences.sonarqubeAppPath;
        // For API calls, still need to use localhost with port
        const port = preferences.sonarqubePort?.trim() || DEFAULT_SONARQUBE_PORT;
        serverUrl = `http://localhost:${port}`;
      } else {
        // Otherwise use localhost with custom port or default port
        const port = preferences.sonarqubePort?.trim() || DEFAULT_SONARQUBE_PORT;
        targetOpenPath = `http://localhost:${port}`;
        serverUrl = targetOpenPath;
      }

      // Run analysis commands in terminal
      const analysisCommands = [
        `cd "${projectPath}"`,
        `echo "--- ${__("commands.runSonarAnalysis.runningAnalysis")} ${projectName} ---"`,
        `./gradlew clean test jacocoTestReport detekt sonar`,
        `echo "--- ${__("commands.runSonarAnalysis.analysisSuccess")}. ${__("commands.openSonarQubeApp.opening")}... ---"`,
        `open "${targetOpenPath}"`,
        `echo "--- ${__("terminal.completed")} ---"`,
      ];

      await runInNewTerminal(
        analysisCommands,
        __("commands.runSonarAnalysis.analysisSuccess"),
        __("commands.runSonarAnalysis.analysisError"),
        { trackProgress: true },
      );

      // After analysis completes, fetch results and use AI to interpret them
      try {
        // Wait a bit for SonarQube to process results
        await showToast({
          style: Toast.Style.Animated,
          title: __("Waiting for SonarQube to process results..."),
        });

        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Extract project key from path (simple heuristic - might need to be adjusted)
        const projectKey = projectPath.split("/").pop() || projectName;

        // Show toast while fetching results
        await showToast({
          style: Toast.Style.Animated,
          title: __("Fetching SonarQube analysis results..."),
        });

        // Fetch analysis results
        const results = await fetchSonarQubeResults(projectKey, serverUrl);

        // If we successfully got results with issues or metrics
        if ((results.issues && results.issues.length > 0) || (results.metrics && results.metrics.length > 0)) {
          // Show AI is analyzing
          await showToast({
            style: Toast.Style.Animated,
            title: __("AI is analyzing your SonarQube results..."),
          });

          // Get AI interpretation
          const interpretation = await interpretAnalysisResults(results);

          // Show success toast
          await showToast({
            style: Toast.Style.Success,
            title: __("AI Analysis Complete"),
            message: __("View the detailed AI analysis report"),
          });

          // Show results in a new view
          push(<AnalysisResultsView results={results} interpretation={interpretation} projectName={projectName} />);
        } else {
          // No results found
          await showToast({
            style: Toast.Style.Failure,
            title: __("No analysis results found"),
            message: __("Make sure SonarQube analysis completed successfully"),
          });
        }
      } catch (error) {
        console.error("Error with AI analysis:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: __("Failed to analyze results with AI"),
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [preferences, __, push],
  );

  // --- Render List ---
  return (
    <List
      isLoading={isLoading}
      navigationTitle={__("commands.runSonarAnalysis.title")}
      actions={
        <ActionPanel>
          <Action
            title={__("projects.management.addProject")}
            icon={Icon.Plus}
            onAction={() => push(<ProjectForm onSubmit={handleAddProject} />)}
            shortcut={Keyboard.Shortcut.Common.New}
          />
        </ActionPanel>
      }
    >
      {projects.length === 0 && !isLoading ? (
        <List.EmptyView
          key="empty-view"
          title={__("commands.runSonarAnalysis.noProjects")}
          description={__("projects.form.addProject")}
          actions={
            <ActionPanel>
              <Action
                title={__("projects.management.addProject")}
                icon={Icon.Plus}
                onAction={() => push(<ProjectForm onSubmit={handleAddProject} />)}
              />
            </ActionPanel>
          }
        />
      ) : (
        projects.map((project) => (
          <List.Item
            key={project.id}
            icon={Icon.TextDocument}
            title={project.name}
            subtitle={project.path}
            actions={
              <ActionPanel title={`${__("projects.form.name")}: ${project.name}`}>
                <Action
                  title={__("commands.runSonarAnalysis.title")}
                  icon={Icon.Terminal}
                  onAction={() => performAnalysis(project.path, project.name)}
                />
                <Action
                  title={__("projects.management.editProject")}
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  onAction={() =>
                    push(
                      <ProjectForm
                        project={project}
                        onSubmit={(values: { name: string; path: string }) => handleEditProject(project.id, values)}
                      />,
                    )
                  }
                />
                <Action
                  title={__("projects.management.deleteProject")}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => handleDeleteProject(project.id)}
                />
                <ActionPanel.Section>
                  <Action
                    title={__("projects.management.addProject")}
                    icon={Icon.Plus}
                    onAction={() => push(<ProjectForm onSubmit={handleAddProject} />)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
