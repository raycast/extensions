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
}

interface Task {
  id: string;
  name: string;
  shortId: string;
  status: {
    name: string;
  };
}

export default function ProjectTaskSearch() {
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
            "gd-api-token": apiKey,
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
              <Action.Push title="Select Project" target={<TaskSearch project={project} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function TaskSearch({ project }: { project: Project }) {
  const { apiKey, baseUrl } = getPreferenceValues<Preferences>();
  const [query, setQuery] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch tasks for the selected project when the component mounts.
  useEffect(() => {
    async function fetchTasks() {
      setIsLoading(true);
      try {
        const response = await fetch(`${baseUrl}/project/${project.id}/tasks`, {
          headers: {
            "gd-api-token": apiKey,
          },
        });
        if (!response.ok) {
          const errorText = await response.text();
          showToast(
            Toast.Style.Failure,
            "Error",
            `Failed to fetch tasks for project "${project.name}": ${response.status} ${response.statusText} - ${errorText}`,
          );
          setIsLoading(false);
          return;
        }
        const data = await response.json();
        if (Array.isArray(data)) {
          setTasks(data);
          setFilteredTasks(data);
        } else {
          showToast(Toast.Style.Failure, "Error", "Unexpected response format for tasks");
        }
      } catch (error) {
        showToast(
          Toast.Style.Failure,
          "Error",
          `Failed to fetch tasks: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
      setIsLoading(false);
    }
    fetchTasks();
  }, [apiKey, baseUrl, project.id, project.name]);

  // Filter tasks based on the search query (by title)
  useEffect(() => {
    if (query.trim().length === 0) {
      setFilteredTasks(tasks);
      return;
    }
    const filtered = tasks.filter((task) => task.name.toLowerCase().includes(query.toLowerCase()));
    setFilteredTasks(filtered);
  }, [query, tasks]);

  return (
    <List isLoading={isLoading} onSearchTextChange={setQuery} searchBarPlaceholder="Search tasks...">
      {filteredTasks.map((task) => (
        <List.Item
          key={task.id}
          title={`#${task.shortId} - ${task.name}`}
          subtitle={task.status.name}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://www.goodday.work/t/${task.id}`} title="Open Task" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
