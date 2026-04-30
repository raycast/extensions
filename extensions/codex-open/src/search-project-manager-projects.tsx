import {
  Action,
  ActionPanel,
  closeMainWindow,
  Detail,
  environment,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import { execFile } from "child_process";
import { existsSync, lstatSync, readFileSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { ReactElement, useEffect, useMemo, useState } from "react";
import tildify from "tildify";
import { CachedProjectEntry, Preferences, ProjectEntry } from "./types";

const PROJECT_MANAGER_STORAGE_NAME = "alefragnani.project-manager";
const CODEX_OPEN_SCRIPT = join(environment.assetsPath, "codex-open");
const preferences = getPreferenceValues<Preferences>();

function getDefaultStoragePath() {
  const appName = preferences.vscodeApp?.name.replace(/^Visual Studio /, "") || "Code";
  return join(
    homedir(),
    "Library",
    "Application Support",
    appName,
    "User",
    "globalStorage",
    PROJECT_MANAGER_STORAGE_NAME,
  );
}

function readJsonFile<T>(filePath: string): T | undefined {
  if (!existsSync(filePath)) {
    return undefined;
  }

  // Project Manager stores compact JSON files; explicit parsing keeps invalid files visible as command errors.
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function getProjectEntries(storagePath: string): ProjectEntry[] {
  const savedProjects = readJsonFile<ProjectEntry[]>(join(storagePath, "projects.json")) ?? [];
  const projectEntries = [...savedProjects];
  const cachedProjectFiles = ["projects_cache_git.json", "projects_cache_any.json", "projects_cache_vscode.json"];

  for (const cachedProjectFile of cachedProjectFiles) {
    const cachedEntries = readJsonFile<CachedProjectEntry[]>(join(storagePath, cachedProjectFile)) ?? [];

    for (const { name, fullPath } of cachedEntries) {
      if (projectEntries.some(({ rootPath }) => rootPath === fullPath)) {
        continue;
      }

      projectEntries.push({ id: fullPath, name, rootPath: fullPath, tags: [], enabled: true });
    }
  }

  // Project Manager may store duplicate paths across saved and cached files; keep the first match.
  const uniqueProjects = new Map<string, ProjectEntry>();
  for (const project of projectEntries) {
    if (project.rootPath && !uniqueProjects.has(project.rootPath)) {
      uniqueProjects.set(project.rootPath, { ...project, tags: getUniqueTags(project.tags) });
    }
  }

  return [...uniqueProjects.values()]
    .filter(({ tags }) => (preferences.hideProjectsWithoutTag ? Array.isArray(tags) && tags.length > 0 : true))
    .filter(({ enabled }) => (preferences.hideProjectsNotEnabled ? enabled !== false : true));
}

function getProjectsLocationPath(): { path: string; error?: string } {
  const projectManagerDataPath = preferences.projectManagerDataPath;

  if (!projectManagerDataPath) {
    return { path: getDefaultStoragePath() };
  }

  if (!existsSync(projectManagerDataPath)) {
    return { path: projectManagerDataPath, error: `Projects Location path does not exist: ${projectManagerDataPath}` };
  }

  const stat = lstatSync(projectManagerDataPath);
  if (stat.isDirectory()) {
    return { path: projectManagerDataPath };
  }

  if (stat.isFile()) {
    return { path: dirname(projectManagerDataPath) };
  }

  return {
    path: projectManagerDataPath,
    error: `Projects Location path is not a directory: ${projectManagerDataPath}`,
  };
}

function getProjectTags(projectEntries: ProjectEntry[]): string[] {
  const tags = new Set<string>();

  for (const project of projectEntries) {
    project.tags?.forEach((tag) => tags.add(tag));
  }

  return [...tags].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

function getProjectsGroupedByTag(projects: ProjectEntry[]): Map<string, ProjectEntry[]> {
  const groupedProjects = new Map<string, ProjectEntry[]>();

  for (const project of projects) {
    const tags = project.tags && project.tags.length > 0 ? project.tags : ["[no tags]"];

    for (const tag of tags) {
      groupedProjects.set(tag, [...(groupedProjects.get(tag) ?? []), project]);
    }
  }

  return new Map([...groupedProjects.entries()].sort(([a], [b]) => compareTagSectionTitles(a, b)));
}

type FrecencyReturnType = ReturnType<typeof useFrecencySorting<ProjectEntry>>;
type FrecencyUpdateType = Pick<FrecencyReturnType, "visitItem" | "resetRanking">;

export default function Command() {
  const { path: projectsLocationPath, error: projectsLocationError } = getProjectsLocationPath();
  const projectEntries = useMemo(() => getProjectEntries(projectsLocationPath), [projectsLocationPath]);
  const projectTags = useMemo(() => getProjectTags(projectEntries), [projectEntries]);
  const [selectedTag, setSelectedTag] = useState("");
  const [searchText, setSearchText] = useState("");
  const [filteredProjects, setFilteredProjects] = useState<ProjectEntry[]>([]);
  const {
    data: sortedProjects,
    visitItem,
    resetRanking,
  } = useFrecencySorting(projectEntries, {
    key: (item) => item.rootPath,
    sortUnvisited: compareProjectsByTagPriority,
  });

  useEffect(() => {
    // Keep fuzzy matching compatible with the reference extension: "abc" matches "a...b...c".
    const searchRegex = new RegExp([...searchText].map(escapeRegex).join(".*"), "i");
    const normalizedSearch = searchText.toLowerCase();

    setFilteredProjects(
      sortedProjects
        .filter((item) => searchRegex.test(item.name))
        .sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();

          if (aName === normalizedSearch) {
            return bName === normalizedSearch ? 0 : -1;
          }

          if (bName === normalizedSearch) {
            return 1;
          }

          return Number(bName.includes(normalizedSearch)) - Number(aName.includes(normalizedSearch));
        }),
    );
  }, [searchText, sortedProjects]);

  if (projectsLocationError) {
    return (
      <ExtensionError
        detail={`## Invalid Projects Location\n\n\`\`\`\n${projectsLocationPath}\n\`\`\`\n\nPlease review the extension preferences.`}
      />
    );
  }

  if (projectEntries.length === 0) {
    return (
      <ExtensionError
        detail={`No Project Manager projects were found.\n\nChecked location:\n\n\`\`\`\n${projectsLocationPath}\n\`\`\`\n\nSave at least one project in the VS Code Project Manager extension, or configure a custom Projects Location.`}
      />
    );
  }

  const updateFrecency = { visitItem, resetRanking };
  const visibleProjects = selectedTag ? filterProjectsByTag(filteredProjects, selectedTag) : filteredProjects;

  return (
    <List
      isShowingDetail={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Project Manager projects"
      searchBarAccessory={
        projectTags.length > 0 ? (
          <List.Dropdown tooltip="Filter by tag" value={selectedTag} onChange={setSelectedTag}>
            <List.Dropdown.Item title="All Projects" value="" />
            {projectTags.map((tag) => (
              <List.Dropdown.Item key={tag} title={tag} value={tag} />
            ))}
          </List.Dropdown>
        ) : null
      }
    >
      {preferences.groupProjectsByTag && !selectedTag
        ? getGroupedProjectElements(visibleProjects, updateFrecency)
        : visibleProjects.map((project) => (
            <ProjectListItem key={project.rootPath} item={project} updateFrecency={updateFrecency} />
          ))}
    </List>
  );
}

function getGroupedProjectElements(projects: ProjectEntry[], updateFrecency: FrecencyUpdateType): ReactElement[] {
  return [...getProjectsGroupedByTag(projects).entries()].map(([tag, taggedProjects]) => (
    <List.Section key={tag} title={tag}>
      {taggedProjects.map((project) => (
        <ProjectListItem key={`${tag}-${project.rootPath}`} item={project} updateFrecency={updateFrecency} />
      ))}
    </List.Section>
  ));
}

function ProjectListItem({ item, updateFrecency }: { item: ProjectEntry; updateFrecency: FrecencyUpdateType }) {
  const { name, rootPath, tags = [] } = item;
  const prettyPath = tildify(rootPath);

  return (
    <List.Item
      icon={Icon.Folder}
      title={name}
      subtitle={dirname(prettyPath)}
      accessories={tags.map((tag) => ({ tag }))}
      actions={
        <ActionPanel>
          <Action
            title="Open in Codex"
            icon={Icon.Terminal}
            onAction={() => {
              updateFrecency.visitItem(item);
              runCodexOpen([rootPath], `Opening ${name} in Codex`);
            }}
          />
          <Action
            title="Open All Worktrees in Codex"
            icon={Icon.Folder}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            onAction={() => {
              updateFrecency.visitItem(item);
              runCodexOpen(["--all", rootPath], `Opening worktrees for ${name}`);
            }}
          />
          <Action.ShowInFinder path={rootPath} />
          <Action.CopyToClipboard title="Copy Path" content={rootPath} />
          <Action
            title="Reset Ranking"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => updateFrecency.resetRanking(item)}
          />
        </ActionPanel>
      }
    />
  );
}

function runCodexOpen(args: string[], successTitle: string) {
  execFile("/bin/sh", [CODEX_OPEN_SCRIPT, ...args], (error, _stdout, stderr) => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Unable to open Codex",
        message: stderr.trim() || error.message,
      });
      return;
    }

    showToast({ style: Toast.Style.Success, title: successTitle });
  });

  closeMainWindow();
}

function ExtensionError({ detail }: { detail: string }) {
  return (
    <Detail
      markdown={detail}
      actions={
        <ActionPanel>
          <Action.ShowInFinder path={getProjectsLocationPath().path} />
        </ActionPanel>
      }
    />
  );
}

function filterProjectsByTag(projects: ProjectEntry[], selectedTag: string): ProjectEntry[] {
  return projects.filter((project) => project.tags?.includes(selectedTag));
}

function compareProjectsByTagPriority(a: ProjectEntry, b: ProjectEntry): number {
  const aHasTags = Boolean(a.tags?.length);
  const bHasTags = Boolean(b.tags?.length);

  if (aHasTags !== bHasTags) {
    return aHasTags ? -1 : 1;
  }

  return a.name.localeCompare(b.name);
}

function compareTagSectionTitles(a: string, b: string): number {
  // Keep untagged projects visible, but place them after the named tag groups.
  if (a === "[no tags]") {
    return b === "[no tags]" ? 0 : 1;
  }

  if (b === "[no tags]") {
    return -1;
  }

  return a.localeCompare(b);
}

function getUniqueTags(tags: string[] | undefined): string[] {
  // Project Manager data can contain repeated tags; keep rendering keys stable by normalizing them once.
  return [...new Set(tags ?? [])];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
