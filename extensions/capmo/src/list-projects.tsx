import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import axios from "axios";
import { getCapmoToken } from "./auth";

interface Project {
  id: string;
  name: string;
  is_archived: boolean;
}

export default function ListProjects() {
  const {
    data: projects,
    isLoading,
    error,
  } = useCachedPromise(async () => {
    try {
      const token = getCapmoToken();
      const response = await axios.get<{ data: { items: Project[] } }>(
        "https://api.capmo.de/api/v1/projects",
        {
          headers: { Authorization: token },
        }
      );

      // Validate and filter projects
      const projectItems = response.data?.data?.items;
      if (Array.isArray(projectItems)) {
        return projectItems.filter((project) => !project.is_archived);
      } else {
        throw new Error("Unexpected response format for projects.");
      }
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "Failed to fetch projects."
      );
    }
  });

  // Handle errors
  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error Fetching Projects",
      message: error.message || "An unknown error occurred.",
    });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects...">
      {projects?.map((project) => (
        <List.Item
          key={project.id}
          title={project.name}
          icon={Icon.Building}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Project"
                url={`https://app.capmo.de/projects/${project.id}/tickets?view=all`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
