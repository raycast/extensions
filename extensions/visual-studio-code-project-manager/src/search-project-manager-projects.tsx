import {
  ActionPanel,
  CopyToClipboardAction,
  Detail,
  environment,
  getPreferenceValues,
  List,
  OpenAction,
  OpenWithAction,
  ShowInFinderAction,
  TrashAction,
} from "@raycast/api";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { dirname } from "path";
import { ReactElement } from "react";
import tildify from "tildify";
import { Preferences, ProjectEntry } from "./types";

const STORAGE = `${homedir()}/Library/Application Support/Code/User/globalStorage/alefragnani.project-manager/projects.json`;

const preferences: Preferences = getPreferenceValues();

function getProjectEntries(): ProjectEntry[] {
  const storageFile = preferences.projectManagerDataPath || STORAGE;
  if (!existsSync(storageFile)) {
    return [];
  }
  return JSON.parse(readFileSync(storageFile).toString());
}

function getSortedProjects(projects: ProjectEntry[]): ProjectEntry[] {
  const projectsToSort = [...projects];
  return projectsToSort.sort((a, b) => a.name.localeCompare(b.name));
}

function getProjectsGroupedByTag(projects: ProjectEntry[]): Map<string, ProjectEntry[]> {
  const groupedProjects = new Map<string, ProjectEntry[]>();

  projects.forEach((project: ProjectEntry) => {
    const tags = project.tags.length > 0 ? project.tags : ["[no tags]"];
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
        {value?.map((project) => (
          <ProjectListItem key={project.rootPath} {...project} />
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
    sortedProjects.forEach((project) => {
      elements.push(<ProjectListItem key={project.rootPath} {...project} />);
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
      accessoryTitle={tags.join(", ")}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenAction title="Open in Code" icon="icon.png" target={path} application="Visual Studio Code" />
            <ShowInFinderAction path={path} />
            <OpenWithAction path={path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CopyToClipboardAction title="Copy Name" content={name} shortcut={{ modifiers: ["cmd"], key: "." }} />
            <CopyToClipboardAction
              title="Copy Path"
              content={prettyPath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <TrashAction paths={[path]} shortcut={{ modifiers: ["ctrl"], key: "x" }} />
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
      <OpenAction
        title="Open projects.json File in Code"
        icon="icon.png"
        target={STORAGE}
        application="Visual Studio Code"
      />
      <ShowInFinderAction title="Show projects.json File in Finder" path={STORAGE} />
      <CopyToClipboardAction title="Copy projects.json File Path" content={STORAGE} />
    </ActionPanel.Section>
  ) : null;
}
