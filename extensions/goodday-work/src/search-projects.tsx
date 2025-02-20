import fetch from "node-fetch";
import { List, ActionPanel, Action, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";

interface Preferences {
  apiKey: string;
  baseUrl: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  endDate: string | null;
  estimate: string | null;
  moment_created: string;
  parentProjectId: string;
  priority: number;
  progress: number | null;
  startDate: string | null;
  status: string;
  systemStatus: number;
  statusComments: string;
}

export default function ProjectSearch() {
  const { apiKey, baseUrl } = getPreferenceValues<Preferences>();
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all projects once when the component mounts.
  useEffect(() => {
    async function fetchProjects() {
      setIsLoading(true);
      try {
        const response = await fetch(`${baseUrl}/projects`, {
          headers: {
            "gd-api-token": `${apiKey}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          showToast(
            Toast.Style.Failure,
            "Error",
            `Failed to fetch projects: ${response.status} ${response.statusText} - ${errorText}`,
          );
          setIsLoading(false);
          return;
        }

        // Since the API returns an array, we can use it directly.
        const data = await response.json();
        if (Array.isArray(data)) {
          setProjects(data);
        } else {
          showToast(Toast.Style.Failure, "Error", "Unexpected response format");
        }
      } catch (error) {
        showToast(
          Toast.Style.Failure,
          "Error",
          `Failed to fetch projects: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
      setIsLoading(false);
    }

    fetchProjects();
  }, [apiKey, baseUrl]);

  // Filter projects based on the search query (by name)
  useEffect(() => {
    if (query.trim().length === 0) {
      setFilteredProjects([]);
      return;
    }
    const filtered = projects.filter((project) => project.name.toLowerCase().includes(query.toLowerCase()));
    setFilteredProjects(filtered);
  }, [query, projects]);

  return (
    <List isLoading={isLoading} onSearchTextChange={setQuery} searchBarPlaceholder="Search projects...">
      {filteredProjects.map((project) => (
        <List.Item
          key={project.id}
          title={project.name}
          subtitle={project.description}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://www.goodday.work/p/${project.id}`} title="Open Project" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
