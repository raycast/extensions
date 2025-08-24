import {
  Action,
  ActionPanel,
  closeMainWindow,
  Detail,
  environment,
  getPreferenceValues,
  Icon,
  List,
} from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import { exec } from "child_process";
import { existsSync, lstatSync, readFileSync } from "fs";
import { homedir } from "os";
import config from "parse-git-config";
import { dirname } from "path";
import { useState, useEffect, ReactElement, Fragment } from "react";
import tildify from "tildify";
import { CachedProjectEntry, Preferences, ProjectEntry } from "./types";

const preferences: Preferences = getPreferenceValues();

const gitClientPath = preferences.gitClientApp?.path || "";
const gitClientInstalled = existsSync(gitClientPath);

const terminalPath = preferences.terminalApp?.path || "";
const terminalInstalled = existsSync(terminalPath);

const { vscodeApp } = preferences;
const vscodeAppNameShort = vscodeApp?.name.replace(/^Visual Studio /, "") || "";
const vscodeAppCLI = `${vscodeApp?.path}/Contents/Resources/app/bin/code`;

const STORAGE = `${homedir()}/Library/Application Support/${vscodeAppNameShort}/User/globalStorage/alefragnani.project-manager`;

const remotePrefix = "vscode-remote://";

function getProjectEntries(storagePath: string): ProjectEntry[] {
  const savedProjectsFile = `${storagePath}/projects.json`;
  const cachedProjectsFiles = [
    `${storagePath}/projects_cache_git.json`,
    `${storagePath}/projects_cache_any.json`,
    `${storagePath}/projects_cache_vscode.json`,
  ];

  let projectEntries: ProjectEntry[] = [];
  if (existsSync(savedProjectsFile)) {
    const savedProjects: ProjectEntry[] = JSON.parse(readFileSync(savedProjectsFile).toString());
    projectEntries.push(...savedProjects);
  }

  cachedProjectsFiles.forEach((cachedFile) => {
    if (existsSync(cachedFile)) {
      const cachedEntries: CachedProjectEntry[] = JSON.parse(readFileSync(cachedFile).toString());
      cachedEntries.forEach(({ name, fullPath }) => {
        if (projectEntries.find(({ rootPath }) => rootPath === fullPath)) {
          return;
        }
        projectEntries.push({ id: fullPath, name, rootPath: fullPath, tags: [], enabled: true });
      });
    }
  });

  if (preferences.hideProjectsWithoutTag) {
    projectEntries = projectEntries.filter(({ tags }) => Array.isArray(tags) && tags.length);
  }

  if (preferences.hideProjectsNotEnabled) {
    projectEntries = projectEntries.filter((e) => e.enabled);
  }

  return projectEntries;
}

function getProjectTags(projectEntries: ProjectEntry[]): string[] {
  return projectEntries?.reduce((tags: string[], project: ProjectEntry) => {
    project.tags?.forEach((tag) => {
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    });

    return tags.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, []);
}

const filterProjectsByTag = (projects: ProjectEntry[], selectedTag: string): ProjectEntry[] => {
  return projects.filter((project) => (selectedTag ? project.tags?.find((tag) => tag === selectedTag) : true));
};

function getProjectsLocationPath(): { path: string; error?: string } {
  const path = preferences.projectManagerDataPath;
  if (!path) {
    return { path: STORAGE };
  }

  if (!existsSync(path)) {
    return { path, error: `Projects Location path does not exist: ${path}` };
  }

  const stat = lstatSync(path);
  if (stat.isDirectory()) {
    return { path };
  }
  if (stat.isFile()) {
    return { path: dirname(path) };
  }

  return { path, error: `Projects Location path is not a directory: ${path}` };
}

function getProjectsGroupedByTag(projects: ProjectEntry[]): Map<string, ProjectEntry[]> {
  const groupedProjects = new Map<string, ProjectEntry[]>();

  projects.forEach((project: ProjectEntry) => {
    const tags = project.tags?.length > 0 ? project.tags : ["[no tags]"];
    tags.forEach((tag) => {
      const projects: ProjectEntry[] = [];
      if (groupedProjects.has(tag)) {
        projects.push(...(groupedProjects.get(tag) || []));
      }
      projects.push(project);
      groupedProjects.set(tag, projects);
    });
  });

  return new Map([...groupedProjects.entries()].sort());
}

type FrecencyReturnType<T extends { id: string }> = ReturnType<typeof useFrecencySorting<T>>;
type FrecencyUpdateType<T extends { id: string }> = Pick<FrecencyReturnType<T>, "visitItem" | "resetRanking">;

function getProjectsGroupedByTagAsElements(
  projectEntries: ProjectEntry[],
  updateFrecency: FrecencyUpdateType<ProjectEntry>,
): ReactElement[] {
  const projectsGrouped = getProjectsGroupedByTag(projectEntries);
  const elements: ReactElement[] = [];
  projectsGrouped.forEach((value, key) => {
    elements.push(
      <List.Section key={key} title={key}>
        {value?.map((project, index) => (
          <ProjectListItem key={project.rootPath + index} item={project} updateFrecency={updateFrecency} />
        ))}
      </List.Section>,
    );
  });
  return elements;
}

export default function Command() {
  if (!vscodeApp) {
    return ExtensionError(
      "Please configure the **Search Project Manager** Raycast extension " +
        "to choose which version of Visual Studio Code to use.",
    );
  }

  const { path: projectsLocationPath, error: projectsLocationError } = getProjectsLocationPath();
  if (projectsLocationError) {
    return ExtensionError(
      "## Invalid Projects Location" +
        "\n\n```\n" +
        projectsLocationPath +
        "\n```\n\n" +
        "Please review the **Projects Location** setting in the extension configuration. " +
        "\n\n" +
        "This setting should only be set if Projects Location is also customized in the VS Code Project Manager extension settings.",
    );
  }

  const projectEntries = getProjectEntries(projectsLocationPath);
  const projectTags = getProjectTags(projectEntries);

  const [selectedTag, setSelectedTag] = useState("");

  if (!projectEntries || projectEntries.length === 0) {
    return ExtensionError(
      "To use this extension, the VS Code Extension " +
        "[Project Manager](https://marketplace.visualstudio.com/items?itemName=alefragnani.project-manager) " +
        "is required and at least one project must be saved in the Project Manager.",
    );
  }

  const {
    data: sortedProjects,
    visitItem,
    resetRanking,
  } = useFrecencySorting(projectEntries, {
    key: (item: ProjectEntry) => item.rootPath,
    sortUnvisited: (a: ProjectEntry, b: ProjectEntry) => a.name.localeCompare(b.name),
  });
  const updateFrecency = { visitItem, resetRanking };

  const [searchText, setSearchText] = useState("");
  const [filteredProjects, filterProjects] = useState(sortedProjects);

  useEffect(() => {
    // Update project list, using frecency-sorted projects
    const searchRgx = new RegExp([...searchText].map(escapeRegex).join(".*"), "i");

    const sortedProjectsSearch = sortedProjects
      // Include all in-exact matches in search results
      .filter((item) => searchRgx.test(item.name))
      // Float exact matches to the top, preserving original order
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const search = searchText.toLowerCase();

        if (aName === search) {
          if (aName === bName) return 0;
          return -1;
        }
        if (bName === search) return 1;

        return +bName.includes(search) - +aName.includes(search);
      });

    filterProjects(sortedProjectsSearch);
  }, [searchText]);

  const elements: ReactElement[] = [];
  if (preferences.groupProjectsByTag && !selectedTag) {
    // don't group if filtering
    const groupedProjects = getProjectsGroupedByTagAsElements(filteredProjects, updateFrecency);
    elements.push(...groupedProjects);
  } else {
    filterProjectsByTag(filteredProjects, selectedTag).forEach((project, index) => {
      elements.push(<ProjectListItem key={project.rootPath + index} item={project} updateFrecency={updateFrecency} />);
    });
  }

  const handleChangeTag = (tag: string) => {
    setSelectedTag(tag);
  };

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search projects ..."
      searchBarAccessory={
        projectTags.length ? (
          <List.Dropdown tooltip="Tags filter" onChange={handleChangeTag} defaultValue={undefined}>
            <List.Dropdown.Section>
              <List.Dropdown.Item key="0" title="All Tags" value={""} />
            </List.Dropdown.Section>
            <List.Dropdown.Section title="Tags">
              {projectTags.map((tag, tagIndex) => (
                <List.Dropdown.Item key={"tag-" + tagIndex} title={tag} value={tag} />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : null
      }
    >
      <Fragment>{elements}</Fragment>
    </List>
  );
}

function ProjectListItem({
  item,
  updateFrecency,
}: {
  item: ProjectEntry;
  updateFrecency: FrecencyUpdateType<ProjectEntry>;
}) {
  const { name, rootPath, tags } = item;
  const { visitItem, resetRanking } = updateFrecency;
  const path = rootPath;
  const prettyPath = tildify(path);
  const subtitle = dirname(prettyPath);
  return (
    <List.Item
      title={name}
      subtitle={subtitle}
      icon={{ fileIcon: path }}
      keywords={tags}
      accessories={[{ text: tags?.join(", ") }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {isRemoteProject(path) ? (
              <Action
                title={`Open in ${vscodeApp.name} (Remote)`}
                icon={{ fileIcon: vscodeApp.path }}
                onAction={() => {
                  visitItem(item);
                  exec(`"${vscodeAppCLI}" --remote ${parseRemoteURL(path)}`);
                  closeMainWindow();
                }}
              />
            ) : (
              <Action.Open
                title={`Open in ${vscodeAppNameShort}`}
                icon={{ fileIcon: vscodeApp.path }}
                target={path}
                application={vscodeApp.path}
                onOpen={() => visitItem(item)}
              />
            )}
            {terminalInstalled && (
              <Action.Open
                title="Open in Terminal"
                key="terminal"
                icon={{ fileIcon: terminalPath }}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                target={path}
                application={terminalPath}
                onOpen={() => visitItem(item)}
              />
            )}
            {gitClientInstalled && isGitRepo(path) && (
              <Action.Open
                title="Open in Git client"
                key="git-client"
                icon={{ fileIcon: gitClientPath }}
                shortcut={{ modifiers: ["cmd"], key: "g" }}
                target={path}
                application={gitClientPath}
                onOpen={() => visitItem(item)}
              />
            )}
            <Action.ShowInFinder path={path} />
            <Action.OpenWith path={path} shortcut={{ modifiers: ["cmd"], key: "o" }} onOpen={() => visitItem(item)} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Name" content={name} shortcut={{ modifiers: ["cmd"], key: "." }} />
            <Action.CopyToClipboard
              title="Copy Path"
              content={prettyPath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Reset Project Ranking"
              icon={Icon.ArrowCounterClockwise}
              onAction={() => resetRanking(item)}
            />
            <Action.Trash paths={[path]} shortcut={{ modifiers: ["ctrl"], key: "x" }} />
          </ActionPanel.Section>
          <DevelopmentActionSection />
        </ActionPanel>
      }
    />
  );
}

function ExtensionError(detail: string) {
  const { path } = getProjectsLocationPath();

  return (
    <Detail
      markdown={detail}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="VS Code App" text={vscodeApp?.name || "(unset)"} />
          <Detail.Metadata.Label
            title={`Projects Location${path ? "" : " (Default)"}`}
            text={tildify(path || STORAGE)}
          />
        </Detail.Metadata>
      }
    />
  );
}

function DevelopmentActionSection() {
  return environment.isDevelopment ? (
    <ActionPanel.Section title="Development">
      <Action.Open
        title="Open projects.json File in Code"
        icon="command-icon.png"
        target={STORAGE}
        application="Visual Studio Code"
      />
      <Action.ShowInFinder title="Show projects.json File in Finder" path={STORAGE} />
      <Action.CopyToClipboard title="Copy projects.json File Path" content={STORAGE} />
    </ActionPanel.Section>
  ) : null;
}

function isGitRepo(path: string): boolean {
  const gitConfig = config.sync({ cwd: path, path: ".git/config", expandKeys: true });
  return !!gitConfig.core;
}

function isRemoteProject(path: string): boolean {
  return path.startsWith(remotePrefix);
}

function parseRemoteURL(path: string): string {
  path = path.slice(remotePrefix.length);
  const index = path.indexOf("/");
  return path.slice(0, index) + " " + path.slice(index) + "/";
}

function escapeRegex(x: string): string {
  return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
