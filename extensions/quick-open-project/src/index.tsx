import {
  ActionPanel,
  closeMainWindow,
  CopyToClipboardAction,
  environment,
  Icon,
  Image,
  ImageLike,
  KeyboardShortcut,
  List,
  OpenInBrowserAction,
  OpenWithAction,
  preferences,
  render,
  ShowInFinderAction,
} from "@raycast/api";
import parser from 'fast-xml-parser'
import Frecency from "frecency";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { sync } from "glob";
import { homedir } from "os";
import { join, normalize } from 'path'
import { useEffect, useState } from "react";
import open = require("open");
import fuzzysort = require("fuzzysort");
import config = require("parse-git-config");
import gh = require("parse-github-url");

interface Remote {
  url: string;
}
type Repo = {
  name: string;
  host: string;
  url: string;
};
type ProjectList = Project[] | undefined;
type ProjectState = {
  projectList: ProjectList | undefined;
  isLoading: boolean;
};

enum SupportedIDE {
  WebStorm,
  PyCharm,
  VSCode,
}

function getIDEName(ide: SupportedIDE): string {
  switch (ide) {
    case SupportedIDE.WebStorm: return 'WebStorm'
    case SupportedIDE.PyCharm: return 'PyCharm'
    case SupportedIDE.VSCode: return 'Visual Studio Code'
    default: return 'Unknown'
  }
}

function getJetbrainsPath(appName: string): string | undefined {
  let appPath: string | null = join('/Applications/', appName)
  if (!existsSync(appPath)) {
    appPath = join(homedir(), 'Applications/JetBrains Toolbox/', appName)
  }
  if (!existsSync(appPath)) {
    return undefined
  }
  return appPath
}
function checkPathExists(v: string): string | undefined {
  return existsSync(v) ? v : undefined
}

let installedIDEsPaths: Map<SupportedIDE, string | undefined>
function getIDEPath(ide: SupportedIDE): string | undefined {
  return installedIDEsPaths.get(ide)
}

function getIDEIcon(ide: SupportedIDE): ImageLike {
  const idePath = installedIDEsPaths.get(ide)
  if (idePath) {
    return {fileIcon: idePath}
  }
  return Icon.TextDocument
}


/**
 * Detects whether directory is a project based on common directories for projects (.git, .idea, .vscode etc).
 * Not 100% accurate, but it doesn't need to
 */
function isProject(dirPath: string): boolean {
  const directoriesToCheck = [
    '.git',
    '.idea',
    '.vscode',
  ]
  return directoriesToCheck.some((v) => existsSync(join(dirPath, v)))
}

class Project {
  name: string;
  displayPath: string;
  fullPath: string;

  constructor(path: string) {
    this.fullPath = path;
    this.displayPath = path;
    if (path.startsWith(homedir())) {
      this.displayPath = path.replace(homedir(), "~");
    }
    const parts = path.split("/");
    this.name = parts[parts.length - 1];
  }

  isGitRepo(): boolean {
    const gitConfig = config.sync({ cwd: this.fullPath, path: ".git/config", expandKeys: true });
    return !!gitConfig.core
  }

  detectIDE(): SupportedIDE | null {
    try {
      const ideaPath = join(this.fullPath, '.idea')
      if (existsSync(ideaPath)) {
        const imlFiles = sync(join(ideaPath, '*.iml'))
        for (const filePath of imlFiles) {
          const contents = readFileSync(filePath, 'utf8')
          const parsedContents = parser.parse(contents, {ignoreAttributes: false})
          switch (parsedContents?.module?.['@_type']) {
            case 'PYTHON_MODULE': return SupportedIDE.PyCharm
            case 'WEB_MODULE': return SupportedIDE.WebStorm
          }
        }
      }
      if (existsSync(join(this.fullPath, '.vscode'))) {
        return SupportedIDE.VSCode
      }
    } catch (error) {
      console.error('Unable to detect IDE', error)
    }
    return null
  }

  gitRemotes(): Repo[] {
    let repos = [] as Repo[];
    const gitConfig = config.sync({ cwd: this.fullPath, path: ".git/config", expandKeys: true });
    if (gitConfig.remote != null) {
      for (const remoteName in gitConfig.remote) {
        const config = gitConfig.remote[remoteName] as Remote;
        const parsed = gh(config.url);
        if (parsed?.host && parsed?.repo) {
          repos = repos.concat({
            name: remoteName,
            host: parsed?.host,
            url: `https://${parsed?.host}/${parsed?.repo}`,
          });
        }
      }
    }
    return repos;
  }
}

function resolveHomedir(path: string): string {
  if (path.startsWith("~")) {
    path = homedir() + path.slice(1)
  }
  return path
}
function parsePreferencesPaths(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .map((path) => normalize(path))
    .map(resolveHomedir)
}

// SupportStorage implements the minimal API required by frecency
class SupportStorage {
  getItem(key: string): string | undefined {
    try {
      const value = readFileSync(environment.supportPath + "/" + key).toString();
      return value;
    } catch {
      return undefined;
    }
  }
  setItem(key: string, value: string): void {
    writeFileSync(environment.supportPath + "/" + key, value);
  }
}

const projectFrecency = new Frecency({
  key: "projects.json", // "key" becomes "filename"
  idAttribute: "fullPath",
  storageProvider: new SupportStorage(),
});

function searchProjects(query?: string): {
  projects: ProjectList;
  isLoading: boolean;
} {
  const [{ projectList, isLoading }, setProjectList] = useState<ProjectState>({ projectList: [], isLoading: true });
  const [projects, setProjects] = useState<ProjectList>();

  useEffect(() => {
    const projectScanPaths = parsePreferencesPaths((preferences.paths.value || '') as string)
    const maxScanDepth: number = Number(preferences.maxScanDepth.value as string) || 1
    const ignoredPaths = parsePreferencesPaths((preferences.ignoredPaths.value || '') as string)

    /**
     * Performs recursive scanning.
     * If the folder _a_ is not a project itself, tries to scan its subdirectories.
     * If any of its subdirectories (up to maxScanDepth) are projects, _a_ is not included to projects list.
     * If none of its subdirectories (up to maxScanDepth) are projects and _a_ is on depth level 1, _a_ is included to projects list.
     * `depth` is current depth of scanning. 0 for base path from preferences, 1 for its subdirectories etc.
     */
    function* scan(basePath: string, depth: number): Generator<string> {
      if (depth >= maxScanDepth) {
        return
      }
      const subdirectories = readdirSync(basePath)
        .map((dir) => join(basePath, dir))
        .filter((path) => statSync(path)?.isDirectory())
      for (const directory of subdirectories) {
        if (ignoredPaths.includes(directory)) {
          return
        }
        if (isProject(directory)) {
          yield directory
        } else {
          let addedRecursiveSubdirectories = 0
          for (const subdirectory of scan(directory, depth + 1)) {
            addedRecursiveSubdirectories++
            yield subdirectory
          }
          if (depth === 0 && addedRecursiveSubdirectories === 0) {
            yield directory
          }
        }
      }
    }

    function* scanAll(): Generator<string> {
      for (const path of projectScanPaths) {
        yield* scan(path, 0)
      }
    }

    const projectPaths = Array.from(scanAll())

    const projects = projectPaths
      .map((path) => new Project(path))
      .sort((a, b) => (a.displayPath.toLowerCase > b.displayPath.toLowerCase ? -1 : 1));
    setProjectList({ projectList: projects, isLoading: false });
  }, []);

  useEffect(() => {
    if (projectList == undefined) {
      return;
    }
    let filtered = projectList;
    if (filtered.length > 0 && query && query.length > 0) {
      filtered = fuzzysort
        .go(query, filtered, { keys: ["name", "displayPath"], allowTypo: false })
        .map((result) => result.obj);
    }
    filtered = projectFrecency.sort({ searchQuery: query || "", results: filtered });
    setProjects(filtered);
  }, [query, projectList]);
  return { projects, isLoading };
}

function updateFrecency(searchQuery: string | undefined, project: Project) {
  projectFrecency.save({ searchQuery: searchQuery || "", selectedId: project.fullPath });
}

function Command() {
  installedIDEsPaths = new Map<SupportedIDE, string | undefined>([
    [SupportedIDE.WebStorm, getJetbrainsPath('WebStorm.app')],
    [
      SupportedIDE.PyCharm,
      // todo: add "Prefer Professional Edition" to configuration
      getJetbrainsPath('PyCharm.app')
      ?? getJetbrainsPath('PyCharm Professional Edition.app')
      ?? getJetbrainsPath('PyCharm Community Edition.app'),
    ],
    // todo: add vscode insiders
    [SupportedIDE.VSCode, checkPathExists('/Applications/Visual Studio Code.app')],
  ])

  let fallbackIDEPath: string | undefined
  let fallbackIDEName: string = 'Unknown'
  // todo: support fallback ide configuration
  for (const ide of [SupportedIDE.VSCode, SupportedIDE.WebStorm, SupportedIDE.PyCharm]) {
    const idePath = installedIDEsPaths.get(ide)
    if (idePath) {
      fallbackIDEPath = idePath
      fallbackIDEName = getIDEName(ide)
      break
    }
  }

  const forkPath = '/Applications/Fork.app'
  const forkInstalled = existsSync(forkPath)

  const [searchQuery, setSearchQuery] = useState<string>();
  const { projects, isLoading } = searchProjects(searchQuery);

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchQuery} selectedItemId={(projects && projects[0]) ? projects[0].fullPath : ""}>
      {projects?.map((project) => {
        const ide = project.detectIDE()

        let idePath: string | undefined
        let ideName: string | undefined
        if (ide !== null) {
          idePath = getIDEPath(ide)
          ideName = getIDEName(ide)
        }
        if (!idePath) {
          // fallback
          idePath = fallbackIDEPath
          ideName = fallbackIDEName
        }
        return (
          <List.Item
            id={project.fullPath}
            key={project.fullPath}
            title={project.name}
            accessoryTitle={project.displayPath}
            icon={ide !== null ? getIDEIcon(ide) : Icon.TextDocument}
            actions={
              <ActionPanel>
                {idePath && (<ActionPanel.Item
                  title={`Open in ${ideName}`}
                  key="editor"
                  onAction={() => {
                    updateFrecency(searchQuery, project)
                    open(project.fullPath, {app: {name: idePath || '', arguments: [project.fullPath]}})
                    closeMainWindow()
                  }}
                  icon={{fileIcon: idePath}}
                  shortcut={{modifiers: ['cmd'], key: 'e'}}
                />)}
                <ActionPanel.Item
                  title="Open in Terminal"
                  key="terminal"
                  onAction={() => {
                    updateFrecency(searchQuery, project)
                    open(project.fullPath, {app: {name: '/Applications/iTerm.app', arguments: [project.fullPath]}})
                    closeMainWindow()
                  }}
                  icon={{fileIcon: '/Applications/iTerm.app'}}
                  shortcut={{modifiers: ['cmd'], key: 't'}}
                />
                {forkInstalled && project.isGitRepo() && (<ActionPanel.Item
                  title="Open in Fork"
                  key="git-fork"
                  onAction={() => {
                    updateFrecency(searchQuery, project)
                    open(project.fullPath, {app: {name: forkPath, arguments: [project.fullPath]}})
                    closeMainWindow()
                  }}
                  icon={{fileIcon: '/Applications/Fork.app'}}
                  shortcut={{modifiers: ['cmd'], key: 'g'}}
                />)}
                {project.gitRemotes().map((remote, i) => {
                  const shortcut = i === 0 ? ({modifiers: ['cmd'], key: 'b'} as KeyboardShortcut) : undefined
                  let icon = undefined as Image | undefined
                  if (remote.host == 'github.com') {
                    icon = {source: {dark: 'github-brands-dark.png', light: 'github-brands-light.png'}}
                  } else if (remote.host == 'gitlab.com') {
                    icon = {source: {dark: 'gitlab-brands-dark.png', light: 'gitlab-brands-light.png'}}
                  }
                  return (
                    <OpenInBrowserAction
                      title={`Open on ${remote.host} (${remote.name})`}
                      key={`open remote ${remote.name}`}
                      url={remote.url}
                      onOpen={() => updateFrecency(searchQuery, project)}
                      shortcut={shortcut}
                      icon={icon}
                    />
                  )
                })}
                <OpenWithAction
                  key="openwith"
                  path={project.fullPath}
                  onOpen={() => updateFrecency(searchQuery, project)}
                  shortcut={{modifiers: ['cmd'], key: 'o'}}
                />
                <ShowInFinderAction
                  title={'Open in Finder'}
                  key="finder"
                  onShow={() => updateFrecency(searchQuery, project)}
                  path={project.fullPath}
                  shortcut={{modifiers: ['cmd'], key: 'f'}}
                />
                <CopyToClipboardAction
                  title={'Copy Path to Clipboard'}
                  key="clipboard"
                  onCopy={() => updateFrecency(searchQuery, project)}
                  content={project.fullPath}
                  shortcut={{modifiers: ['cmd'], key: 'p'}}
                />
              </ActionPanel>
            }
          />
        )
      })}
    </List>
  );
}

mkdirSync(environment.supportPath, { recursive: true });
render(<Command />);
