import { ActionPanel, List, Action, Icon, LocalStorage, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { getProjects, Project } from "./utils/projects";
import { getRoutes, Route } from "./utils/routes";
import { openInEditor } from "./utils/editor";

const LAST_PROJECT_KEY = "last-active-project-routes";

export default function Command() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (currentProject) {
      fetchRoutes(currentProject.path);
    }
  }, [currentProject]);

  async function loadData() {
    setIsLoading(true);
    const savedProjects = await getProjects();
    setProjects(savedProjects);

    const lastPath = await LocalStorage.getItem<string>(LAST_PROJECT_KEY);
    let selected = savedProjects.length > 0 ? savedProjects[0] : null;

    if (lastPath) {
      const match = savedProjects.find((p) => p.path === lastPath);
      if (match) selected = match;
    }

    setCurrentProject(selected);
    setIsLoading(false);
  }

  async function fetchRoutes(path: string) {
    setIsLoading(true);
    const data = await getRoutes(path);
    setRoutes(data);
    setIsLoading(false);
  }

  async function handleProjectChange(projectId: string) {
    const project = projects.find((p) => p.path === projectId);
    if (project) {
      setCurrentProject(project);
      await LocalStorage.setItem(LAST_PROJECT_KEY, project.path);
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={currentProject ? `Search routes in ${currentProject.name}...` : "Select a project..."}
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter"
          onChange={(val) => {
            // Check if it's a project ID or a method
            // Actually, we can't easily mix project selection and method filter in one accessory unless we use two logic paths or one dropdown
            // Limitation: Raycast only allows one searchBarAccessory?
            // Actually, we can nest them or swap them? No.
            // Best pattern: Project selection is primary. Method filter can be a separate dropdown if we could have 2, but we can't.
            // Solution: Add project selection to the dropdown ONLY if we merge them, OR put project selection in a separate Step?
            // Existing pattern in run-artisan uses project selection in dropdown.
            // I will put Method filter as a separate dropdown if possible? No.
            // I will stick to Project Selection in dropdown. Method filtering can be done via search text "GET /api" or just text.
            // OR I can use the same dropdown for project selection, but that blocks filtering.

            // BETTER: Use `List.Dropdown` for Method Filter, and `Action` to switch project?
            // OR: Standardize on Project Selection in dropdown, and just search.
            handleProjectChange(val);
          }}
          value={currentProject?.path}
        >
          <List.Dropdown.Section title="Projects">
            {projects.map((p) => (
              <List.Dropdown.Item key={p.path} title={p.name} value={p.path} icon={Icon.Folder} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {projects.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Folder} title="No Projects Found" description="Add a Laravel project first." />
      ) : (
        routes.map((route, index) => (
          <List.Item
            key={`${route.method}-${route.uri}-${index}`}
            title={route.uri}
            subtitle={route.name || ""}
            keywords={[route.method, route.uri, route.action]}
            accessories={[
              {
                tag: {
                  value: route.method.split("|")[0],
                  color: route.method.includes("GET")
                    ? Color.Blue
                    : route.method.includes("POST")
                      ? Color.Green
                      : route.method.includes("DELETE")
                        ? Color.Red
                        : route.method.includes("PUT")
                          ? Color.Orange
                          : Color.SecondaryText,
                },
              },
            ]}
            detail={
              <List.Item.Detail
                markdown={`# ${route.uri}

**Method**: \`${route.method}\`
**Action**: \`${route.action}\`
**Name**: \`${route.name || "N/A"}\`

## Middleware
${route.middleware.map((m) => `- ${m}`).join("\n")}
`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Domain" text={route.domain || "N/A"} />
                    <List.Item.Detail.Metadata.Label title="URI" text={route.uri} />
                    <List.Item.Detail.Metadata.Label title="Method" text={route.method} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.CopyToClipboard title="Copy URI" content={route.uri} />
                  <Action.CopyToClipboard title="Copy Action" content={route.action} />
                </ActionPanel.Section>
                <ActionPanel.Section title="Project">
                  <Action
                    title="Open in Editor"
                    icon={Icon.Code}
                    onAction={() => currentProject && openInEditor(currentProject.path)}
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
