import { Action, ActionPanel, closeMainWindow, Detail, environment, getPreferenceValues, List } from "@raycast/api";
import { existsSync, lstatSync, readFileSync } from "fs";
import open from "open";
import { homedir } from "os";
import config from "parse-git-config";
import { dirname } from "path";
import { ReactElement } from "react";
import tildify from "tildify";
import { CachedProjectEntry, Preferences, ProjectEntry, VSCodeBuild } from "./types";

const preferences: Preferences = getPreferenceValues();

const gitClientPath = preferences.gitClientAppPath || "";
const gitClientInstalled = existsSync(gitClientPath);

const terminalPath = preferences.terminalAppPath || "";
const terminalInstalled = existsSync(terminalPath);

const build: VSCodeBuild = preferences.build;
const appKeyMapping = {
  Code: "com.microsoft.VSCode",
  "Code - Insiders": "com.microsoft.VSCodeInsiders",
} as const;
const appKey: string = appKeyMapping[build] ?? appKeyMapping.Code;

const STORAGE = `${homedir()}/Library/Application Support/${build}/User/globalStorage/alefragnani.project-manager`;

function getProjectEntries(): ProjectEntry[] {
  const storagePath = getPreferencesPath() || STORAGE;
  const savedProjectsFile = `${storagePath}/projects.json`;
  const cachedProjectsFiles = [`${storagePath}/projects_cache_git.json`, `${storagePath}/projects_cache_any.json`];

  let projectEntries: ProjectEntry[] = [];
  if (existsSync(savedProjectsFile)) {
    const savedProjects: ProjectEntry[] = JSON.parse(readFileSync(savedProjectsFile).toString());
    projectEntries.push(...savedProjects);
  }

  cachedProjectsFiles.forEach((cachedFile) => {
    if (existsSync(cachedFile)) {
      const cachedEntries: CachedProjectEntry[] = JSON.parse(readFileSync(cachedFile).toString());
      cachedEntries.forEach(({ name, fullPath }) => {
        projectEntries.push({ name, rootPath: fullPath, tags: [], enabled: true });
      });
    }
  });

  if (preferences.hideProjectsWithoutTag) {
    projectEntries = projectEntries.filter(({ tags }) => Array.isArray(tags) && tags.length);
  }

  return projectEntries;
}

function getPreferencesPath(): string | undefined {
  const path = preferences.projectManagerDataPath;
  if (path && existsSync(path)) {
    const stat = lstatSync(path);
    if (stat.isDirectory()) {
      return path;
    }
    if (stat.isFile()) {
      return dirname(path);
    }
  }
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
        {value?.map((project, index) => (
          <ProjectListItem key={project.rootPath + index} {...project} />
        ))}
      </List.Section>
    );
  });
  return elements;
}

export default function Command() {
  const elements: ReactElement[] = [];
  const projectEntries = getProjectEntries();
  if (!projectEntries || projectEntries.length === 0) {
    return (
      <Detail
        markdown="To use this extension, the Visual Studio Extension 
      [Project Manager](https://marketplace.visualstudio.com/items?itemName=alefragnani.project-manager)
       is required."
      />
    );
  }

  const sortedProjects = getSortedProjects(projectEntries);

  if (preferences.groupProjectsByTag) {
    const groupedProjects = getProjectsGroupedByTagAsElements(sortedProjects);
    elements.push(...groupedProjects);
  } else {
    sortedProjects.forEach((project, index) => {
      elements.push(<ProjectListItem key={project.rootPath + index} {...project} />);
    });
  }

  return <List searchBarPlaceholder="Search projects ...">{elements}</List>;
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
      accessoryTitle={tags?.join(", ")}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Open title={`Open in ${build}`} icon="command-icon.png" target={path} application={appKey} />
            {terminalInstalled && (
              <Action
                title="Open in Terminal"
                key="terminal"
                onAction={() => {
                  open(path, { app: { name: terminalPath, arguments: [path] } });
                  closeMainWindow();
                }}
                icon={{ fileIcon: terminalPath }}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
            )}
            {gitClientInstalled && isGitRepo(path) && (
              <Action
                title="Open in Git client"
                key="git-client"
                onAction={() => {
                  open(path, { app: { name: gitClientPath, arguments: [path] } });
                  closeMainWindow();
                }}
                icon={{ fileIcon: gitClientPath }}
                shortcut={{ modifiers: ["cmd"], key: "g" }}
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
