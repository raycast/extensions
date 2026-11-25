import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { getProjects } from "../gcloud";
import { CacheManager, Project } from "../utils/CacheManager";

interface PinnedProjectsViewProps {
  gcloudPath: string;
  selectedProject: string | null;
  pinnedProjects: string[];
  onPinnedChange: (pinnedProjects: string[]) => void;
  onSelectProject: (projectId: string) => void;
}

export function PinnedProjectsView({
  gcloudPath,
  selectedProject,
  pinnedProjects,
  onPinnedChange,
  onSelectProject,
}: PinnedProjectsViewProps) {
  const [localPinnedProjects, setLocalPinnedProjects] = useState<string[]>(pinnedProjects);
  const { pop } = useNavigation();

  const {
    data: projects = [],
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async (path: string) => {
      const fetched = await getProjects(path);
      CacheManager.saveProjectsList(fetched);
      return fetched;
    },
    [gcloudPath],
    {
      initialData: CacheManager.getProjectsList()?.projects,
      keepPreviousData: true,
      onError: (err) => {
        showFailureToast(err, { title: "Failed to load projects" });
      },
    },
  );

  const { pinnedList, otherList } = useMemo(() => {
    const pinnedSet = new Set(localPinnedProjects);
    const byId = new Map(projects.map((p) => [p.id, p]));

    const pinned: Project[] = [];
    for (const id of localPinnedProjects) {
      const project = byId.get(id);
      if (project) pinned.push(project);
    }

    const others = projects
      .filter((p) => !pinnedSet.has(p.id))
      .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));

    return { pinnedList: pinned, otherList: others };
  }, [projects, localPinnedProjects]);

  function handleTogglePin(project: Project) {
    const { pinned, pinnedProjects: updated } = CacheManager.togglePinnedProject(project.id);
    setLocalPinnedProjects(updated);
    onPinnedChange(updated);
    showToast({
      style: Toast.Style.Success,
      title: pinned ? "Project pinned" : "Project unpinned",
      message: project.name || project.id,
    });
  }

  function handleSelect(project: Project) {
    onSelectProject(project.id);
    pop();
  }

  function renderProjectItem(project: Project, isPinned: boolean) {
    const isSelected = project.id === selectedProject;
    const accessories: List.Item.Accessory[] = [];
    if (isSelected) {
      accessories.push({ tag: { value: "Current", color: Color.Blue } });
    }
    if (isPinned) {
      accessories.push({ icon: { source: Icon.Pin, tintColor: Color.Yellow }, tooltip: "Pinned" });
    }

    return (
      <List.Item
        key={project.id}
        title={project.name || project.id}
        subtitle={project.name && project.name !== project.id ? project.id : undefined}
        keywords={[project.id]}
        icon={{ source: isPinned ? Icon.Pin : Icon.Box, tintColor: isPinned ? Color.Yellow : Color.Blue }}
        accessories={accessories}
        actions={
          <ActionPanel>
            <Action
              title={isPinned ? "Unpin Project" : "Pin Project"}
              icon={isPinned ? Icon.PinDisabled : Icon.Pin}
              shortcut={Keyboard.Shortcut.Common.Pin}
              onAction={() => handleTogglePin(project)}
            />
            <Action
              title="Switch to Project"
              icon={Icon.ArrowRight}
              shortcut={Keyboard.Shortcut.Common.Open}
              onAction={() => handleSelect(project)}
            />
            <Action.CopyToClipboard
              title="Copy Project ID"
              content={project.id}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action
              title="Refresh Projects"
              icon={Icon.RotateClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (error && projects.length === 0) {
    return (
      <List isLoading={isLoading} navigationTitle="Manage Pinned Projects">
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Failed to Load Projects"
          description={error.message || "Could not fetch Google Cloud projects"}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.RotateClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
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
      navigationTitle="Manage Pinned Projects"
      searchBarPlaceholder="Search projects by name or ID..."
    >
      {projects.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Box}
          title="No Projects Found"
          description="No Google Cloud projects were returned for your active account."
          actions={
            <ActionPanel>
              <Action
                title="Refresh Projects"
                icon={Icon.RotateClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {pinnedList.length > 0 && (
            <List.Section title="Pinned Projects" subtitle={`${pinnedList.length}`}>
              {pinnedList.map((project) => renderProjectItem(project, true))}
            </List.Section>
          )}
          <List.Section title="All Projects" subtitle={`${otherList.length}`}>
            {otherList.map((project) => renderProjectItem(project, false))}
          </List.Section>
        </>
      )}
    </List>
  );
}
