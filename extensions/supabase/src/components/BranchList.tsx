import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { supabaseFetch } from "../lib/api";
import type { Project, Branch } from "../lib/types";
import { getProjectUrl, getStatusColor } from "../lib/utils";
import { MOCK_ENABLED, mockBranches } from "../lib/mock-data";

type BranchListProps = {
  project: Project;
  accessToken: string;
};

export function BranchList({ project, accessToken }: BranchListProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadBranches = useCallback(async () => {
    setIsLoading(true);
    try {
      if (MOCK_ENABLED) {
        // Use mock data for screenshots
        setBranches(mockBranches[project.id] || []);
      } else {
        const data = await supabaseFetch<Branch[]>(`/projects/${project.id}/branches`, accessToken);
        setBranches(data);
      }
    } catch {
      setBranches([]);
    } finally {
      setIsLoading(false);
    }
  }, [project.id, accessToken]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  if (!isLoading && branches.length === 0) {
    return (
      <List navigationTitle={`${project.name} - Branches`}>
        <List.EmptyView
          title="No Branches"
          description="This project doesn't have any branches or branching is not enabled."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Project Dashboard" url={getProjectUrl(project.id)} />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={loadBranches}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${project.name} - Branches`}
      searchBarPlaceholder="Search branches..."
    >
      {branches.map((branch) => (
        <List.Item
          key={branch.id}
          title={branch.name}
          subtitle={branch.is_default ? "Default" : ""}
          icon={{ source: Icon.Tree, tintColor: getStatusColor(branch.status) }}
          accessories={[
            { text: branch.status, icon: Icon.Circle },
            {
              date: new Date(branch.updated_at),
              tooltip: `Updated: ${new Date(branch.updated_at).toLocaleString()}`,
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Open">
                <Action.OpenInBrowser title="Open Project Dashboard" url={getProjectUrl(branch.project_ref)} />
              </ActionPanel.Section>
              <ActionPanel.Section title="Copy">
                <Action.CopyToClipboard
                  title="Copy Branch ID"
                  content={branch.id}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Project Ref"
                  content={branch.project_ref}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={loadBranches}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
