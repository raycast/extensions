import {
  ActionPanel,
  CopyToClipboardAction,
  Icon,
  Image,
  KeyboardShortcut,
  List,
  OpenInBrowserAction,
  OpenWithAction,
  ShowInFinderAction,
  closeMainWindow,
  environment,
  preferences,
  render,
} from "@raycast/api";
import Frecency from "frecency";
import { mkdirSync, statSync, readFileSync, writeFileSync } from "fs";
import { sync } from "glob";
import { homedir } from "os";
import { useMemo, useState } from "react";
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
type ProjectList = Project[];

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
} {
  const projectList = useMemo(() => {
    const projectPaths = (preferences.paths.value as string).split(",").map((s) => s.trim());
    const projects = projectPaths
      .flatMap((base) => {
        if (base.startsWith("~")) {
          base = homedir() + base.slice(1);
        }
        return sync(base + "/*");
      })
      .filter((path) => statSync(path)?.isDirectory())
      .map((path) => new Project(path))
      .sort((a, b) => (a.displayPath.toLowerCase > b.displayPath.toLowerCase ? -1 : 1));
    return projects;
  }, []);

  const projects = useMemo(() => {
    let filtered = projectList;
    if (filtered.length > 0 && query && query.length > 0) {
      filtered = fuzzysort
        .go(query, filtered, {
          keys: ["name", "displayPath"],
          allowTypo: false,
          threshold: -1000000, // pick a pretty big negative number
          scoreFn: (a) => {
            let scores = [-1000001] as number[]; // less than the threshold by default
            if (a[0]) {
              scores = scores.concat(a[0].score);
            }
            if (a[1]) {
              // scores are negative, so make displayPath matches worse than direct name matches
              scores = scores.concat(a[1].score * 10);
            }
            return Math.max(...scores);
          },
        })
        .map((result) => result.obj);
    }
    // but: frecency matches will take precedence if parts of the path are included.
    filtered = projectFrecency.sort({ searchQuery: query || "", results: filtered });
    return filtered;
  }, [query, projectList]);
  return { projects };
}

function updateFrecency(searchQuery: string | undefined, project: Project) {
  // the selectedId attribute has to match the projectFrecency config set above
  projectFrecency.save({ searchQuery: searchQuery || "", selectedId: project.fullPath });
}

function Command() {
  const [searchQuery, setSearchQuery] = useState<string>();
  const { projects } = searchProjects(searchQuery);

  return (
    <List onSearchTextChange={setSearchQuery} selectedItemId={projects[0] ? projects[0].fullPath : ""}>
      {projects.map((project) => (
        <List.Item
          id={project.fullPath}
          key={project.fullPath}
          title={project.name}
          accessoryTitle={project.displayPath}
          icon={Icon.TextDocument}
          actions={
            <ActionPanel>
              <ActionPanel.Item
                title="Open in VSCode"
                key="editor"
                onAction={() => {
                  updateFrecency(searchQuery, project);
                  open(project.fullPath, { app: { name: "/Applications/Visual Studio Code.app" } });
                  closeMainWindow();
                }}
                icon={{ fileIcon: "/Applications/Visual Studio Code.app" }}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <ActionPanel.Item
                title="Open in Terminal"
                key="terminal"
                onAction={() => {
                  updateFrecency(searchQuery, project);
                  open(project.fullPath, { app: { name: "/Applications/iTerm.app", arguments: [project.fullPath] } });
                  closeMainWindow();
                }}
                icon={{ fileIcon: "/Applications/iTerm.app" }}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
              <ActionPanel.Item
                title="Open in VSCode and Terminal"
                key="both"
                onAction={() => {
                  updateFrecency(searchQuery, project);
                  open(project.fullPath, { app: { name: "/Applications/iTerm.app", arguments: [project.fullPath] } });
                  open(project.fullPath, { app: { name: "/Applications/Visual Studio Code.app" } });
                  closeMainWindow();
                }}
                icon={Icon.Window}
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              />
              {project.gitRemotes().map((remote, i) => {
                const shortcut = i === 0 ? ({ modifiers: ["cmd"], key: "b" } as KeyboardShortcut) : undefined;
                let icon = undefined as Image | undefined;
                if (remote.host == "github.com") {
                  icon = { source: { dark: "github-brands-dark.png", light: "github-brands-light.png" } };
                } else if (remote.host == "gitlab.com") {
                  icon = { source: { dark: "gitlab-brands-dark.png", light: "gitlab-brands-light.png" } };
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
                );
              })}
              <OpenWithAction
                key="openwith"
                path={project.fullPath}
                onOpen={() => updateFrecency(searchQuery, project)}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <ShowInFinderAction
                title={"Open in Finder"}
                key="finder"
                onShow={() => updateFrecency(searchQuery, project)}
                path={project.fullPath}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
              />
              <CopyToClipboardAction
                title={"Copy Path to Clipboard"}
                key="clipboard"
                onCopy={() => updateFrecency(searchQuery, project)}
                content={project.fullPath}
                shortcut={{ modifiers: ["cmd"], key: "p" }}
              />
            </ActionPanel>
          }
        ></List.Item>
      ))}
    </List>
  );
}

mkdirSync(environment.supportPath, { recursive: true });
render(<Command />);
