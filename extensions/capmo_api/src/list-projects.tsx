import { Action, ActionPanel, List, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import axios from "axios";
import { getCapmoToken } from "./auth";

interface Project {
  id: string;
  name: string;
  is_archived: boolean;
}

export default function ListProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch projects when the component mounts
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);

    try {
      const token = getCapmoToken();

      const response = await axios.get<{ data: { items: Project[] } }>("https://api.capmo.de/api/v1/projects", {
        headers: { Authorization: token },
      });

      // Validate and filter projects
      const projects = response.data?.data?.items;
      if (projects && Array.isArray(projects)) {
        const nonArchivedProjects = projects.filter((project) => !project.is_archived);
        setProjects(nonArchivedProjects);
      } else {
        throw new Error("Unexpected response format for projects.");
      }
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      const errorMessage = error.response?.data?.message || error.message || "An unknown error occurred.";
      showToast({
        style: Toast.Style.Failure,
        title: "Error Fetching Projects",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects...">
      {projects.map((project) => (
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
