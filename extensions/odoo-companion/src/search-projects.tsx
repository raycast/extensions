import { Action, ActionPanel, List, getPreferenceValues, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { OdooService } from "./services/odoo";
import { Preferences, Project } from "./types";

export default function SearchProjects() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionChecked, setConnectionChecked] = useState(false);
  const odooService = new OdooService(preferences);

  // Fonction pour rechercher des projets
  const searchProjects = async (query: string): Promise<Project[]> => {
    if (!query.trim()) return [];

    setIsLoading(true);
    try {
      const results = await odooService.searchByName<Project>("project.project", query, {
        fields: [
          "id",
          "name",
          "display_name",
          "description",
          "user_id",
          "partner_id",
          "stage_id",
          "task_count",
          "active",
          "company_id",
          "date_start",
          "date",
        ],
      });
      return results;
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour récupérer tous les projets
  const getAllProjects = async (): Promise<Project[]> => {
    setIsLoading(true);
    try {
      const results = await odooService.getAll<Project>("project.project", {
        fields: [
          "id",
          "name",
          "display_name",
          "description",
          "user_id",
          "partner_id",
          "stage_id",
          "task_count",
          "active",
          "company_id",
          "date_start",
          "date",
        ],
        limit: 100,
      });
      return results;
    } finally {
      setIsLoading(false);
    }
  };

  // Effect pour vérifier la connexion et charger les données
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);

        // Vérifier la connexion
        const isConnected = await odooService.testConnection();
        if (!isConnected) {
          showFailureToast({
            title: "Connection failed",
            message: "Unable to connect to Odoo. Please check your settings.",
          });
          setConnectionChecked(true);
          setIsLoading(false);
          return;
        }

        // Charger les données
        const projectsData = await getAllProjects();
        setProjects(projectsData);
        setConnectionChecked(true);
        setIsLoading(false);
      } catch (error) {
        console.error("Error during initialization:", error);
        showFailureToast({
          title: "Initialization failed",
          message: "Failed to initialize project search. Please check your configuration.",
        });
        setConnectionChecked(true);
        setIsLoading(false);
      }
    };

    // Start initialization immediately
    initializeData();
  }, []);

  // Debounced search effect
  useEffect(() => {
    // Skip search if connection hasn't been checked yet
    if (!connectionChecked) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        if (searchText.length >= 2) {
          const projectsData = await searchProjects(searchText);
          setProjects(projectsData);
        } else if (searchText.length === 0) {
          // Si pas de recherche, recharger tous les projets
          const projectsData = await getAllProjects();
          setProjects(projectsData);
        }
      } catch (error) {
        console.error("Error during search:", error);
        showFailureToast({
          title: "Search failed",
          message: "Unable to search projects. Please check your connection.",
        });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchText, connectionChecked]);

  // Fonction pour ouvrir les tâches du projet
  const openProjectTasks = (project: Project) => {
    const tasksUrl = `${preferences.odooUrl.replace(/\/$/, "")}/odoo/action-369/${project.id}/tasks`;

    try {
      open(tasksUrl);
    } catch (error) {
      console.error("Error opening project tasks:", error);
      showFailureToast({
        title: "Error opening tasks",
        message: "Could not open project tasks. Please check the URL manually.",
      });
    }
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search projects by name..."
      throttle
    >
      <List.Section title="Projects" subtitle={`${projects.length} project${projects.length !== 1 ? "s" : ""}`}>
        {projects.map((project) => (
          <List.Item
            key={project.id}
            title={project.display_name || project.name}
            subtitle={project.description}
            accessories={[
              ...(project.task_count ? [{ text: `${project.task_count} tasks` }] : []),
              ...(project.user_id ? [{ text: `Manager: ${project.user_id[1]}` }] : []),
              ...(project.partner_id ? [{ text: `Client: ${project.partner_id[1]}` }] : []),
              ...(project.stage_id ? [{ text: project.stage_id[1] }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action title="Open Project Tasks" onAction={() => openProjectTasks(project)} icon="📋" />
                <Action.CopyToClipboard title="Copy Project Name" content={project.display_name || project.name} />
                <Action.CopyToClipboard
                  title="Copy Project URL"
                  content={`${preferences.odooUrl.replace(/\/$/, "")}/odoo/action-369/${project.id}/tasks`}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {searchText.length > 0 && searchText.length < 2 && (
        <List.EmptyView title="Type at least 2 characters" description="Start typing to search for projects by name" />
      )}
      {searchText.length >= 2 && projects.length === 0 && !isLoading && (
        <List.EmptyView
          title="No projects found"
          description={`No projects match "${searchText}". Try a different search term or check if the Project module is installed in Odoo.`}
        />
      )}
      {searchText.length === 0 && projects.length === 0 && !isLoading && connectionChecked && (
        <List.EmptyView
          title="No projects available"
          description="No projects found. You may not have the necessary permissions to view projects."
        />
      )}
    </List>
  );
}
