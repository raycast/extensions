import ClearCache from "#/components/actions/clear-cache";
import { OpenTerminal } from "#/components/actions/open-terminal";
import { RemoveProject } from "#/components/actions/remove-project";
import { ResetRanking } from "#/components/actions/reset-item-ranking";
import { ViewProjectWorktrees } from "#/components/actions/view-project-worktrees";
import { getPreferences } from "#/helpers/raycast";
import { useProjects } from "#/hooks/use-projects";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import AddWorktree from "./add-worktree";
import { EmptyWorktreeList } from "./view-worktrees";

export default function Command() {
  const { projects, isLoadingProjects, revalidateProjects, visitProject, resetProjectRanking } = useProjects();
  const { projectsPath } = getPreferences();

  if (!projects.length)
    return (
      <List>
        <EmptyWorktreeList
          title="No Projects Found"
          description="Please clone a new project to get started or update your project directory in preferences"
          directory={projectsPath}
          actions={{ cloneProject: true, clearCache: true }}
          revalidateProjects={revalidateProjects}
        />
      </List>
    );

  return (
    <List isLoading={isLoadingProjects}>
      {projects?.map((project) => {
        const url = project.gitRemotes.at(0)?.url;

        return (
          <List.Item
            key={project.id}
            icon={Icon.Folder}
            title={project.name}
            subtitle={project.displayPath}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Project Actions">
                  <ViewProjectWorktrees projectId={project.id} visitProject={() => visitProject?.(project)} />

                  <Action.Push
                    title="Add New Worktree"
                    icon={Icon.Plus}
                    target={<AddWorktree directory={project.fullPath} />}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />

                  <OpenTerminal path={project.fullPath} />
                </ActionPanel.Section>

                <ActionPanel.Section title="Extra Actions">
                  <ClearCache revalidateProjects={revalidateProjects} />

                  <RemoveProject project={project} revalidateProjects={revalidateProjects} />

                  {url && (
                    <Action.OpenInBrowser
                      url={url}
                      title="Open Repository in Browser"
                      shortcut={{ modifiers: ["cmd"], key: "b" }}
                    />
                  )}

                  <Action.ShowInFinder
                    title="Show in Finder"
                    path={project.fullPath}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                  />

                  <ResetRanking title="Reset Project Ranking" resetRanking={() => resetProjectRanking?.(project)} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
