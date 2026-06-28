import { List, ActionPanel, Action, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { supabaseFetch } from "./lib/api";
import type { Project, Organization } from "./lib/types";
import { getProjectUrl, getStatusColor, groupProjectsByOrg } from "./lib/utils";
import { BranchList } from "./components/BranchList";
import { MOCK_ENABLED, mockProjects, mockOrganizations } from "./lib/mock-data";

export default function Command() {
  const { accessToken } = getPreferenceValues<ExtensionPreferences>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (MOCK_ENABLED) {
        setProjects(mockProjects);
        setOrganizations(mockOrganizations);
      } else {
        const [projectsData, orgsData] = await Promise.all([
          supabaseFetch<Project[]>("/projects", accessToken),
          supabaseFetch<Organization[]>("/organizations", accessToken),
        ]);
        setProjects(projectsData);
        setOrganizations(orgsData);
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load projects",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const groupedProjects = groupProjectsByOrg(projects, organizations);

  if (!isLoading && projects.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No Projects Found"
          description="You don't have any Supabase projects yet."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Create Project in Supabase" url="https://supabase.com/dashboard/new" />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={loadData}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects...">
      {groupedProjects.map(({ org, projects: orgProjects }) => (
        <List.Section key={org.id} title={org.name} subtitle={`${orgProjects.length} projects`}>
          {orgProjects.map((project) => (
            <List.Item
              key={project.id}
              title={project.name}
              subtitle={project.region}
              icon={{
                source: Icon.Box,
                tintColor: getStatusColor(project.status),
              }}
              accessories={[
                { text: project.status, icon: Icon.Circle },
                {
                  date: new Date(project.created_at),
                  tooltip: `Created: ${new Date(project.created_at).toLocaleString()}`,
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Navigate">
                    <Action.Push
                      title="View Branches"
                      icon={Icon.Tree}
                      target={<BranchList project={project} accessToken={accessToken} />}
                    />
                    <Action.OpenInBrowser
                      title="Open Project Dashboard"
                      url={getProjectUrl(project.id)}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard
                      title="Copy Project Ref"
                      content={project.id}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Project URL"
                      content={getProjectUrl(project.id)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={loadData}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
