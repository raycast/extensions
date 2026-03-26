import { Icon, List } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { ProjectListItem } from "./components/project-list-item";
import { useWorkspaceDropdown } from "./components/with-workspace";
import { useProjects } from "./hooks/use-projects";
import { oauthService } from "./oauth";

function SearchProjects() {
  const { workspaceId, allWorkspaceIds, isLoading: isLoadingWorkspace, dropdown } = useWorkspaceDropdown();
  const { projects, isLoading: isLoadingProjects, error: projectsError } = useProjects(workspaceId, allWorkspaceIds);

  const activeProjects = projects.filter((p) => !(p.completedAt || p.archivedAt));
  const completedProjects = projects.filter((p) => p.completedAt && !p.archivedAt);
  const isLoading = isLoadingWorkspace || isLoadingProjects;

  return (
    <List isLoading={isLoading} searchBarAccessory={dropdown} searchBarPlaceholder="Filter projects...">
      {projectsError && !isLoading ? (
        <List.EmptyView
          description={projectsError instanceof Error ? projectsError.message : String(projectsError)}
          icon={Icon.ExclamationMark}
          title="Couldn’t load projects"
        />
      ) : (
        <>
          <List.Section
            subtitle={`${activeProjects.length} project${activeProjects.length === 1 ? "" : "s"}`}
            title="Active"
          >
            {activeProjects.map((project) => (
              <ProjectListItem key={project.id} project={project} />
            ))}
          </List.Section>
          {completedProjects.length > 0 && (
            <List.Section subtitle={`${completedProjects.length}`} title="Completed">
              {completedProjects.map((project) => (
                <ProjectListItem key={project.id} project={project} />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

export default withAccessToken(oauthService)(SearchProjects);
