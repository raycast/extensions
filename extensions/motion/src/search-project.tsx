import { ActionPanel, Detail, List, Action, Icon, showToast, Toast, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import { getWorkspaces, getProjects, MotionWorkspace, MotionProject } from "./motion-api";

interface ProjectWithWorkspace extends MotionProject {
  workspace: MotionWorkspace;
}

export default function SearchProject() {
  const [projects, setProjects] = useState<ProjectWithWorkspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    async function loadProjects() {
      try {
        console.log("🔄 Loading projects...");

        // Get workspaces first
        const workspaces = await getWorkspaces();

        // Get projects for each workspace
        const allProjects: ProjectWithWorkspace[] = [];

        for (const workspace of workspaces) {
          try {
            const workspaceProjects = await getProjects(workspace.id);
            const projectsWithWorkspace = workspaceProjects.map((project) => ({
              ...project,
              workspace,
            }));
            allProjects.push(...projectsWithWorkspace);
          } catch (error) {
            console.error(`Failed to load projects for workspace ${workspace.name}:`, error);
          }
        }

        setProjects(allProjects);
        console.log(`✅ Loaded ${allProjects.length} projects from ${workspaces.length} workspaces`);
      } catch (error) {
        console.error("❌ Failed to load projects:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Load Projects",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadProjects();
  }, []);

  // Helper function to determine if a project is active (not completed/cancelled)
  function isActiveProject(project: MotionProject): boolean {
    if (!project.status) return true; // If no status, assume active

    const statusName = project.status.name.toLowerCase();

    // Filter out completed, cancelled, done, finished, archived projects
    const inactiveStatuses = [
      "completed",
      "complete",
      "done",
      "finished",
      "cancelled",
      "canceled",
      "archived",
      "closed",
      "resolved",
      "ended",
    ];

    return !inactiveStatuses.some((inactive) => statusName.includes(inactive)) && !project.status.isResolvedStatus;
  }

  // Helper function to get project priority for sorting
  function getProjectSortPriority(project: MotionProject): number {
    if (!project.status) return 3; // Default priority for projects without status

    const statusName = project.status.name.toLowerCase();

    // Priority order: in-progress (1), todo/planned (2), backlog (3), others (4)
    if (statusName.includes("progress") || statusName.includes("active") || statusName.includes("current")) {
      return 1; // In Progress - highest priority
    }
    if (
      statusName.includes("todo") ||
      statusName.includes("planned") ||
      statusName.includes("ready") ||
      statusName.includes("next")
    ) {
      return 2; // Todo/Planned - second priority
    }
    if (statusName.includes("backlog") || statusName.includes("future") || statusName.includes("someday")) {
      return 3; // Backlog - third priority
    }

    // For default status, put it in todo category
    if (project.status.isDefaultStatus) {
      return 2;
    }

    return 4; // Other statuses - lowest priority
  }

  // Filter and sort projects
  const filteredAndSortedProjects = projects
    .filter((project) => {
      // First filter by active status
      if (!isActiveProject(project)) return false;

      // Then filter by search text
      if (!searchText) return true;

      const searchLower = searchText.toLowerCase();
      return (
        project.name.toLowerCase().includes(searchLower) ||
        project.description.toLowerCase().includes(searchLower) ||
        project.workspace.name.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      // Sort by priority first
      const priorityA = getProjectSortPriority(a);
      const priorityB = getProjectSortPriority(b);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // If same priority, sort by updated date (most recent first)
      return new Date(b.updatedTime).getTime() - new Date(a.updatedTime).getTime();
    });

  async function copyProjectId(project: MotionProject) {
    await Clipboard.copy(project.id);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Project ID",
      message: `"${project.name}" ID copied to clipboard`,
    });
  }

  async function copyProjectName(project: MotionProject) {
    await Clipboard.copy(project.name);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Project Name",
      message: `"${project.name}" copied to clipboard`,
    });
  }

  function getProjectStatusIcon(project: MotionProject): string {
    if (!project.status) return "📋";

    const statusName = project.status.name.toLowerCase();

    // In Progress projects
    if (statusName.includes("progress") || statusName.includes("active") || statusName.includes("current")) {
      return "🚀"; // In Progress
    }

    // Todo/Planned projects
    if (
      statusName.includes("todo") ||
      statusName.includes("planned") ||
      statusName.includes("ready") ||
      statusName.includes("next")
    ) {
      return "📝"; // Todo/Planned
    }

    // Backlog projects
    if (statusName.includes("backlog") || statusName.includes("future") || statusName.includes("someday")) {
      return "📚"; // Backlog
    }

    // Default status
    if (project.status.isDefaultStatus) {
      return "📝"; // Treat default as todo
    }

    return "📋"; // Other statuses
  }

  function getProjectStatusSection(project: MotionProject): string {
    const priority = getProjectSortPriority(project);

    switch (priority) {
      case 1:
        return "🚀 In Progress";
      case 2:
        return "📝 Todo & Planned";
      case 3:
        return "📚 Backlog";
      default:
        return "📋 Other";
    }
  }

  function formatProjectDescription(description: string): string {
    // Remove HTML tags and decode HTML entities for display
    return description
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim();
  }

  function ProjectDetail({ project }: { project: ProjectWithWorkspace }) {
    const formattedDescription = formatProjectDescription(project.description);

    const markdown = `
# ${project.name}

**Workspace:** ${project.workspace.name}
**Status:** ${project.status?.name || "No status"}
**Created:** ${new Date(project.createdTime).toLocaleDateString()}
**Updated:** ${new Date(project.updatedTime).toLocaleDateString()}

## Description

${formattedDescription || "No description available"}

---

**Project ID:** \`${project.id}\`
**Workspace ID:** \`${project.workspaceId}\`
    `;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Project ID"
              content={project.id}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Project Name"
              content={project.name}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Workspace ID"
              content={project.workspaceId}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Group projects by section for better organization
  const projectSections = filteredAndSortedProjects.reduce(
    (acc, project) => {
      const section = getProjectStatusSection(project);
      if (!acc[section]) {
        acc[section] = [];
      }
      acc[section].push(project);
      return acc;
    },
    {} as Record<string, ProjectWithWorkspace[]>,
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search active projects by name, description, or workspace..."
      throttle
    >
      {filteredAndSortedProjects.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Active Projects Found"
          description={searchText ? "Try adjusting your search terms" : "No active projects available"}
        />
      )}

      {Object.entries(projectSections).map(([sectionTitle, sectionProjects]) => (
        <List.Section key={sectionTitle} title={sectionTitle}>
          {sectionProjects.map((project) => (
            <List.Item
              key={project.id}
              icon={getProjectStatusIcon(project)}
              title={project.name}
              subtitle={project.workspace.name}
              accessories={[
                { text: project.status?.name || "No status" },
                { text: new Date(project.updatedTime).toLocaleDateString() },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push title="Show Details" target={<ProjectDetail project={project} />} icon={Icon.Eye} />
                  <ActionPanel.Section title="Copy">
                    <Action
                      title="Copy Project ID"
                      onAction={() => copyProjectId(project)}
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action
                      title="Copy Project Name"
                      onAction={() => copyProjectName(project)}
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
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
