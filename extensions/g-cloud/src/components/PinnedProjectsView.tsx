import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
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
  const [projects, setProjects] = useState<Project[]>(() => CacheManager.getProjectsList()?.projects ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(() => !CacheManager.getProjectsList());
  const { pop } = useNavigation();

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      try {
        const fetchedProjects = await getProjects(gcloudPath);
        if (cancelled) return;
        CacheManager.saveProjectsList(fetchedProjects);
        setProjects(fetchedProjects);
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to fetch projects:", error);
        if (projects.length === 0) {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to load projects",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadProjects();
    return () => {
      cancelled = true;
    };
  }, [gcloudPath]);

  const { pinnedList, otherList } = useMemo(() => {
    const pinnedSet = new Set(pinnedProjects);
    const byId = new Map(projects.map((p) => [p.id, p]));

    const pinned: Project[] = [];
    for (const id of pinnedProjects) {
      const project = byId.get(id);
      if (project) pinned.push(project);
    }

    const others = projects
      .filter((p) => !pinnedSet.has(p.id))
      .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));

    return { pinnedList: pinned, otherList: others };
  }, [projects, pinnedProjects]);

  function handleTogglePin(project: Project) {
    const { pinned, pinnedProjects: updated } = CacheManager.togglePinnedProject(project.id);
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
        icon={{ source: isPinned ? Icon.Pin : Icon.Box, tintColor: isPinned ? Color.Yellow : Color.Blue }}
        accessories={accessories}
        actions={
          <ActionPanel>
            <Action
              title={isPinned ? "Unpin Project" : "Pin Project"}
              icon={isPinned ? Icon.PinDisabled : Icon.Pin}
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
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Manage Pinned Projects"
      searchBarPlaceholder="Search projects to pin..."
    >
      {pinnedList.length > 0 && (
        <List.Section title="Pinned Projects" subtitle={`${pinnedList.length}`}>
          {pinnedList.map((project) => renderProjectItem(project, true))}
        </List.Section>
      )}
      <List.Section title="All Projects" subtitle={`${otherList.length}`}>
        {otherList.map((project) => renderProjectItem(project, false))}
      </List.Section>
    </List>
  );
}
