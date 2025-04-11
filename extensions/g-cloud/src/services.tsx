import { useState, useEffect } from "react";
import { ActionPanel, List, getPreferenceValues, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { CacheManager, Project } from "./utils/CacheManager";

interface ExtensionPreferences {
  gcloudPath: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { push } = useNavigation();
  const GCLOUD_PATH = getPreferenceValues<ExtensionPreferences>().gcloudPath;

  useEffect(() => {
    loadCachedProjects();
  }, []);

  async function loadCachedProjects() {
    // Try to get cached projects list
    const cachedProjects = CacheManager.getProjectsList();
    
    if (cachedProjects) {
      setProjects(cachedProjects.projects);
      setIsLoading(false);
    } else {
      setError("No cached projects found. Please open the main extension first to cache your projects.");
      showToast({
        style: Toast.Style.Failure,
        title: "No cached projects",
        message: "Please open the main extension first",
      });
      setIsLoading(false);
    }
  }

  function viewServices(projectId: string) {
    // This should be implemented based on your Services view
    // For now, we'll just show a toast message
    showToast({
      style: Toast.Style.Success,
      title: "Service Management",
      message: `Viewing services for project ${projectId}`,
    });
    
    // In the future, implement:
    // push(<ServicesView projectId={projectId} gcloudPath={GCLOUD_PATH} />);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects...">
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: "red" }}
          title="Error"
          description={error}
        />
      ) : (
        projects.map((project: Project) => (
          <List.Item
            key={project.id}
            title={project.name}
            subtitle={project.id}
            icon={{ source: Icon.Cog }}
            actions={
              <ActionPanel>
                <ActionPanel.Item
                  title="View Services & APIs"
                  onAction={() => viewServices(project.id)}
                  icon={{ source: Icon.Cog }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
} 