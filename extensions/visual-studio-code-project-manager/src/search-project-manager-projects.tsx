import { Action, ActionPanel, closeMainWindow, Detail, environment, getPreferenceValues, List } from "@raycast/api";
import { exec } from "child_process";
import { existsSync, lstatSync, readFileSync } from "fs";
import { homedir } from "os";
import config from "parse-git-config";
import { dirname } from "path";
import { Fragment, ReactElement, useState } from "react";
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
        projectEntries.push({ name, rootPath: fullPath, tags: [], enabled: true });
      });
    }
  });

  if (preferences.hideProjectsWithoutTag) {
    projectEntries = projectEntries.filter(({ tags }) => Array.isArray(tags) && tags.length);
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

function getSortedProjects(projects: ProjectEntry[]): ProjectEntry[] {
  const projectsToSort = [...projects];
  return projectsToSort.sort((a, b) => a.name.localeCompare(b.name));
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

function getProjectsGroupedByTagAsElements(projectEntries: ProjectEntry[]): ReactElement[] {
  const projectsGrouped = getProjectsGroupedByTag(projectEntries);
  const elements: ReactElement[] = [];
  projectsGrouped.forEach((value, key) => {
    elements.push(
      <List.Section key={key} title={key}>
        {value?.map((project, index) => <ProjectListItem key={project.rootPath + index} {...project} />)}
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

  const sortedProjects = getSortedProjects(projectEntries);

  const elements: ReactElement[] = [];
  if (preferences.groupProjectsByTag && !selectedTag) {
    // don't group if filtering
    const groupedProjects = getProjectsGroupedByTagAsElements(sortedProjects);
    elements.push(...groupedProjects);
  } else {
    filterProjectsByTag(sortedProjects, selectedTag).forEach((project, index) => {
      elements.push(<ProjectListItem key={project.rootPath + index} {...project} />);
    });
  }

  const handleChangeTag = (tag: string) => {
    setSelectedTag(tag);
  };

  return (
    <List
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

function ProjectListItem({ name, rootPath, tags }: ProjectEntry) {
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
              />
            )}
            <Action.ShowInFinder path={path} />
            <Action.OpenWith path={path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
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
