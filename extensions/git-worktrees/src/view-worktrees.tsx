import ClearCache from "#/components/actions/clear-cache";
import { getPreferences } from "#/helpers/raycast";
import { useDebounce } from "#/hooks/use-debounce";
import { useProjects } from "#/hooks/use-projects";
import { useViewingWorktreesStore } from "#/stores/viewing-worktrees";
import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { relative } from "node:path";
import { useMemo } from "react";
import AddWorktree from "./add-worktree";
import CloneProject from "./clone-project";
import { DirectoriesDropdown, useDirectory } from "./components/actions/directories-dropdown";
import { Worktree } from "./components/worktree";
import type { BareRepository, Project } from "./config/types";
import { formatPath } from "./helpers/file";

export default function Command({ projectId }: { projectId?: string }) {
  const { directory } = useDirectory();

  const preferences = getPreferences();

  const updateSelectedWorktree = useViewingWorktreesStore((state) => state.updateSelectedWorktree);
  const handleOnSelectionChange = useDebounce((worktreePath) => updateSelectedWorktree(worktreePath ?? undefined));

  const {
    projects: incomingProjects,
    isLoadingProjects,
    revalidateProjects,
    visitProject,
    resetProjectRanking,
  } = useProjects();

  const enableWorktreesGrouping = preferences.enableWorktreesGrouping;

  const [projects, groupedOrUngroupedWorktrees] = useMemo(() => {
    const records = incomingProjects ?? [];

    const filteredRecords = directory === "all" ? records : records.filter((item) => item.id.endsWith(directory));
    const worktrees = enableWorktreesGrouping ? filteredRecords : filteredRecords.flatMap((p) => p.worktrees);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const projects: BareRepository[] = records.map(({ id, worktrees, ...project }) => project);

    return [projects, worktrees];
  }, [directory, incomingProjects, preferences.enableProjectsFrequencySorting, enableWorktreesGrouping]);

  if (projectId) {
    const project = incomingProjects?.find((p) => p.id === projectId);
    if (!project) return null;

    if (!project.worktrees.length)
      return (
        <List>
          <EmptyWorktreeList
            directory={project.fullPath}
            actions={{ addWorktree: true }}
            revalidateProjects={revalidateProjects}
          />
        </List>
      );

    return (
      <List isLoading={isLoadingProjects}>
        <Worktree.List project={project} worktrees={project.worktrees} revalidateProjects={revalidateProjects} />
      </List>
    );
  }

  if (groupedOrUngroupedWorktrees.length === 0 && isLoadingProjects)
    return (
      <List>
        <EmptyWorktreeList
          title="Loading Worktrees..."
          description="Please wait while we load your worktrees"
          directory={directory}
          actions={{ addWorktree: false, cloneProject: false, clearCache: false }}
          revalidateProjects={revalidateProjects}
        />
      </List>
    );

  return (
    <List
      isLoading={isLoadingProjects}
      searchBarAccessory={projects && <DirectoriesDropdown projects={projects} />}
      onSelectionChange={handleOnSelectionChange}
    >
      {enableWorktreesGrouping ? (
        directory &&
        (groupedOrUngroupedWorktrees as Project[]).length === 1 &&
        (groupedOrUngroupedWorktrees as Project[]).at(0)?.worktrees.length === 0 ? (
          <EmptyWorktreeList
            directory={directory}
            actions={{ cloneProject: true }}
            revalidateProjects={revalidateProjects}
          />
        ) : (
          (groupedOrUngroupedWorktrees as Project[]).map((project) => (
            <List.Section title={project.displayPath} key={project.id} subtitle={project.worktrees.length.toString()}>
              <Worktree.List
                project={project}
                worktrees={project.worktrees}
                rankBareRepository={(action) =>
                  action === "increment" ? visitProject?.(project) : resetProjectRanking?.(project)
                }
                revalidateProjects={revalidateProjects}
              />
            </List.Section>
          ))
        )
      ) : (
        <Worktree.List worktrees={groupedOrUngroupedWorktrees as Worktree[]} revalidateProjects={revalidateProjects} />
      )}
    </List>
  );
}

export const EmptyWorktreeList = ({
  title,
  description,
  directory,
  actions = { cloneProject: false, addWorktree: false, openPreferences: true, clearCache: true },
  revalidateProjects,
}: {
  title?: string;
  description?: string;
  directory?: string;
  actions?: {
    cloneProject?: boolean;
    addWorktree?: boolean;
    openPreferences?: boolean;
    clearCache?: boolean;
  };
  revalidateProjects?: () => void;
}) => {
  const preferences = getPreferences();

  const path = relative(preferences.projectsPath, directory ?? "");

  return (
    <List.EmptyView
      title={title ?? `No bare repos or worktrees found in ${formatPath(path)}`}
      description={description ?? "Try adding a new worktree or changing your repo dir preference."}
      actions={
        <ActionPanel>
          {actions.cloneProject && <Action.Push title="Clone Project" icon={Icon.Plus} target={<CloneProject />} />}

          {actions.addWorktree && (
            <Action.Push title="Add Worktree" icon={Icon.Plus} target={<AddWorktree directory={directory} />} />
          )}

          {actions.openPreferences && (
            <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          )}

          {actions.clearCache && !!revalidateProjects && <ClearCache revalidateProjects={revalidateProjects} />}
        </ActionPanel>
      }
    />
  );
};
