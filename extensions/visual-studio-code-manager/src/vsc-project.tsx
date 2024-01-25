/* eslint-disable @typescript-eslint/no-explicit-any */
import { Action, ActionPanel, closeMainWindow, environment, getPreferenceValues, List } from "@raycast/api";
import { exec } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import config from "parse-git-config";
import { dirname, resolve } from "path";
import { useState, Fragment, useMemo, useLayoutEffect } from "react";
import tildify from "tildify";
import { Preferences, ProjectEntry, VSCodeBuild } from "./types";
import { allProject } from "./search-project";
import recentProject from "./recent-project";
import { openProjectInNewTab, openProjectInNewWindow } from "./open-in-iterm";

const commandIconPath = resolve(__dirname, "assets/command-icon.png");

const preferences: Preferences = getPreferenceValues();

const gitClientPath = preferences.gitClientAppPath || "";
const gitClientInstalled = existsSync(gitClientPath);

const terminalPath = preferences.terminalAppPath || "";
const terminalInstalled = existsSync(terminalPath);

const build: VSCodeBuild = preferences.build;
const appKeyMapping = {
  Code: "com.microsoft.VSCode",
  "Code - Insiders": "com.microsoft.VSCodeInsiders",
  "VSCodium < 1.71": "com.visualstudio.code.oss",
  VSCodium: "com.vscodium",
  Cursor: "Cursor",
} as const;
const appKey: string = appKeyMapping[build] ?? appKeyMapping.Code;

const STORAGE = `${homedir()}/Library/Application Support/${build}/User/globalStorage/alefragnani.project-manager`;

const remotePrefix = "vscode-remote://";

const filterProjectsByTag = (projects: ProjectEntry[], selectedTag: string): ProjectEntry[] => {
  return projects.filter((project) => (selectedTag ? project.tags?.find((tag) => tag === selectedTag) : true));
};

const p0 = recentProject.getRecentProject();

const p1 = allProject.getAllProject();

const p3 = allProject.getRealTimeAllProject();

export default function Command() {
  const [projectList, setProjectList] = useState<ProjectEntry[]>([]);

  const [recentProjectList, setRecentProjectList] = useState<ProjectEntry[]>([]);

  useLayoutEffect(() => {
    p0.then((data) => {
      setRecentProjectList(data.list);
    });
  }, []);

  useLayoutEffect(() => {
    p1.then((data) => {
      setProjectList([...data.list]);
      if (!data.list?.length) {
        p3.then((list) => {
          setProjectList([...list]);
        });
      }
    });
  }, []);

  function onClickProjectItem() {
    setRecentProjectList([...recentProject.rencentProjectList]);
  }

  const elements = useMemo(() => {
    return filterProjectsByTag(projectList, "").map((project, index) => {
      return <ProjectListItem key={project.rootPath + index} projectItem={project} onClick={onClickProjectItem} />;
    });
  }, [projectList]);

  const recentElements = useMemo(() => {
    return filterProjectsByTag(recentProjectList, "").map((project, index) => {
      return <ProjectListItem key={project.rootPath + index} projectItem={project} onClick={onClickProjectItem} />;
    });
  }, [recentProjectList]);

  return (
    <List
      searchBarPlaceholder="Search projects ..."
      isLoading={projectList.length || recentProjectList.length ? false : true}
    >
      <List.Section key="recent" title="Recent Projects">
        <Fragment>{recentElements}</Fragment>
      </List.Section>
      <List.Section key="all" title="All Projects">
        <Fragment>{elements}</Fragment>
      </List.Section>
    </List>
  );
}

function ProjectListItem(props: { projectItem: ProjectEntry; onClick?: any }) {
  const { name, rootPath, tags } = props.projectItem;
  const path = rootPath;
  const prettyPath = tildify(path);
  const subtitle = dirname(prettyPath);
  return (
    <List.Item
      title={name}
      subtitle={subtitle}
      icon={commandIconPath}
      keywords={tags}
      accessories={[{ text: tags?.join(", ") }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {isRemoteProject(path) ? (
              <Action
                title={`Open in ${build} (Remote)`}
                icon="command-icon.png"
                onAction={() => {
                  exec("code --remote " + parseRemoteURL(path));
                  closeMainWindow();
                }}
              />
            ) : (
              <Action.Open
                title={`Open in ${build}`}
                icon="command-icon.png"
                target={path}
                application={appKey}
                onOpen={() => {
                  recentProject.updateRecentJSON(props.projectItem);
                  props.onClick?.();
                  closeMainWindow();
                }}
              />
            )}
            {terminalInstalled && isItermApp() && !isNewWindow(path) && (
              <Action
                title="Open in Terminal (New Window)"
                key="terminal-new-window"
                icon={{ fileIcon: terminalPath }}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                onAction={() => {
                  openProjectInNewWindow({ command: `cd ${path}` });
                  closeMainWindow();
                }}
              />
            )}
            {terminalInstalled && isItermApp() && !isNewWindow(path) && (
              <Action
                title="Open in Terminal (New Tab)"
                key="terminal-new-tab"
                icon={{ fileIcon: terminalPath }}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                onAction={() => {
                  openProjectInNewTab({ command: `cd ${path}` });
                  closeMainWindow();
                }}
              />
            )}
            {terminalInstalled && !isItermApp() && !isNewWindow(path) && (
              <Action.Open
                title="Open in Terminal"
                key="terminal"
                icon={{ fileIcon: terminalPath }}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                target={path}
                application={terminalPath}
              />
            )}
            {gitClientInstalled && isGitRepo(path) && !isNewWindow(path) && (
              <Action.Open
                title="Open in Git Client"
                key="git-client"
                icon={{ fileIcon: gitClientPath }}
                shortcut={{ modifiers: ["cmd"], key: "g" }}
                target={path}
                application={gitClientPath}
              />
            )}
            {isNewWindow(path) ? null : <Action.ShowInFinder path={path} />}
            {isNewWindow(path) ? null : <Action.OpenWith path={path} shortcut={{ modifiers: ["cmd"], key: "o" }} />}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Name" content={name} shortcut={{ modifiers: ["cmd"], key: "." }} />
            <Action.CopyToClipboard
              title="Copy Path"
              content={prettyPath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
          {isNewWindow(path) ? null : (
            <ActionPanel.Section>
              <Action.Trash paths={[path]} shortcut={{ modifiers: ["ctrl"], key: "x" }} />
            </ActionPanel.Section>
          )}
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

function isRemoteProject(path: string): boolean {
  return path.startsWith(remotePrefix);
}

function isNewWindow(path: string) {
  return path === "-n";
}

function isItermApp() {
  return terminalPath.includes("iTerm.app");
}

function parseRemoteURL(path: string): string {
  path = path.slice(remotePrefix.length);
  const index = path.indexOf("/");
  return path.slice(0, index) + " " + path.slice(index) + "/";
}
