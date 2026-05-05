import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  getPreferenceValues,
  openCommandPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ManageScanRootsForm } from "./components/manage-scan-roots-form";
import { resolveProjectApps } from "./open";
import { loadHydratedProjectCache } from "./project-records";
import { ProjectActions } from "./components/project-actions";
import { ProjectDetail } from "./components/project-detail";
import { getRuntimeStatuses } from "./runtime";
import { getProjectTitle, scanProjects } from "./scanner";
import {
  createDefaultStorageState,
  saveProjectCache,
  seedScanRootsFromPreferences,
  upsertProjectOverride,
} from "./storage";
import {
  PreferredApp,
  ProjectFilter,
  ProjectOverride,
  ProjectRecord,
  RuntimeStatus,
  ScanPreferences,
  StorageState,
} from "./types";

export default function Command() {
  const preferences = getPreferenceValues<Preferences.ListProjects>();
  const defaultIdeApp = preferences.defaultIdeApp as PreferredApp;
  const defaultTerminalApp = preferences.defaultTerminalApp as PreferredApp;
  const [storageState, setStorageState] = useState<StorageState>(createDefaultStorageState());
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [runtimeStatuses, setRuntimeStatuses] = useState<Record<string, RuntimeStatus>>({});
  const [filter, setFilter] = useState<ProjectFilter>("all");
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async (nextState?: StorageState) => {
    setIsLoading(true);

    try {
      const loadedState =
        nextState ??
        (await seedScanRootsFromPreferences({
          initialScanRoot: preferences.initialScanRoot,
          additionalScanRoots: preferences.additionalScanRoots,
        } satisfies ScanPreferences));

      if (!nextState) {
        const cachedProjects = await loadHydratedProjectCache(loadedState);

        if (cachedProjects.length > 0) {
          setStorageState(loadedState);
          setProjects(cachedProjects);
          setRuntimeStatuses(await getRuntimeStatuses(cachedProjects));
        }
      }

      const scannedProjects = loadedState.scanRoots.length > 0 ? await scanProjects(loadedState) : [];
      const nextRuntimeStatuses = await getRuntimeStatuses(scannedProjects);

      await saveProjectCache(scannedProjects);
      setStorageState(loadedState);
      setProjects(scannedProjects);
      setRuntimeStatuses(nextRuntimeStatuses);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to scan projects",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      if (filter === "all") {
        return !project.archived;
      }

      if (filter === "pinned") {
        return project.pinned && !project.archived;
      }

      if (filter === "archived") {
        return project.archived;
      }

      return project.rootId === filter.slice("root:".length) && !project.archived;
    });
  }, [filter, projects]);

  async function handleProjectUpdated(projectId: string, patch: ProjectOverride) {
    const nextState = await upsertProjectOverride(projectId, patch);
    await refresh(nextState);
  }

  async function handleStateChanged(nextState?: StorageState) {
    await refresh(nextState);
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search projects by name, path, framework, language, git remote, or URL"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Projects"
          value={filter}
          onChange={(value) => setFilter(value as ProjectFilter)}
          storeValue
        >
          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item title="All" value="all" icon={Icon.List} />
            <List.Dropdown.Item title="Pinned" value="pinned" icon={Icon.Pin} />
            <List.Dropdown.Item title="Archived" value="archived" icon={Icon.Archive} />
          </List.Dropdown.Section>
          {storageState.scanRoots.length > 0 ? (
            <List.Dropdown.Section title="Scan Roots">
              {storageState.scanRoots.map((root) => (
                <List.Dropdown.Item key={root.id} title={root.label} value={`root:${root.id}`} icon={Icon.Folder} />
              ))}
            </List.Dropdown.Section>
          ) : null}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title={storageState.scanRoots.length === 0 ? "Add scan roots to get started" : "No projects found"}
        description={
          storageState.scanRoots.length === 0
            ? "Set required scan roots in command preferences, or manage roots here after the initial setup."
            : "Try another filter, edit scan roots, or rescan after creating a project."
        }
        icon={Icon.Folder}
        actions={
          <ActionPanel>
            <Action title="Open Command Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
            <Action.Push
              title="Add Scan Directory"
              icon={Icon.Plus}
              target={
                <ManageScanRootsForm scanRoots={storageState.scanRoots} onSaved={handleStateChanged} mode="add" />
              }
            />
            <Action.Push
              title="Manage Scan Roots"
              icon={Icon.Gear}
              target={<ManageScanRootsForm scanRoots={storageState.scanRoots} onSaved={handleStateChanged} />}
            />
            {storageState.scanRoots.length > 0 ? (
              <Action title="Rescan All Projects" icon={Icon.ArrowClockwise} onAction={() => void refresh()} />
            ) : null}
          </ActionPanel>
        }
      />
      {filteredProjects.map((project) => (
        <List.Item
          key={project.id}
          id={project.id}
          icon={getProjectIcon(project, runtimeStatuses[project.id])}
          title={getProjectTitle(project)}
          keywords={buildKeywords(project)}
          detail={
            <ProjectDetail
              project={project}
              runtimeStatus={runtimeStatuses[project.id]}
              {...resolveProjectApps(project, defaultIdeApp, defaultTerminalApp)}
            />
          }
          actions={
            <ProjectActions
              project={project}
              runtimeStatus={runtimeStatuses[project.id]}
              scanRoots={storageState.scanRoots}
              defaultIdeApp={defaultIdeApp}
              defaultTerminalApp={defaultTerminalApp}
              onProjectUpdated={(patch) => handleProjectUpdated(project.id, patch)}
              onStateChanged={handleStateChanged}
              onRefresh={refresh}
            />
          }
        />
      ))}
    </List>
  );
}

function buildKeywords(project: ProjectRecord): string[] {
  return [
    project.path,
    project.rootLabel,
    project.packageName,
    project.description,
    ...project.frameworks,
    ...project.languages,
    ...project.gitRemotes.flatMap((remote) => [remote.name, remote.url, remote.host]),
    ...project.urls,
    ...project.urlsFromPackageMetadata,
  ].filter((value): value is string => Boolean(value));
}

function getProjectIcon(project: ProjectRecord, runtimeStatus?: RuntimeStatus) {
  if (project.archived) {
    return { source: Icon.Archive, tintColor: Color.SecondaryText };
  }

  if (runtimeStatus?.isActive) {
    return { source: Icon.Circle, tintColor: Color.Green };
  }

  if (project.pinned) {
    return { source: Icon.Pin, tintColor: Color.Yellow };
  }

  if (project.isEmptyDirectory) {
    return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }

  return Icon.Folder;
}
