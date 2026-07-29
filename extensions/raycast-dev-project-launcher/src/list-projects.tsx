import { useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  getPreferenceValues,
  showToast,
  Toast,
  closeMainWindow,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import os from "os";
import path from "path";

import type { AppPathStore, EditorTarget, ProjectEntity } from "./types";
import {
  detectDefaultRoots,
  expandHome,
  parseCommaSeparated,
  scanForProjects,
} from "./lib/projectScanner";
import { appDisplayName, loadAppPathStore, resolveAppPath } from "./lib/appPathStore";
import { iconForProjectType } from "./lib/projectIcons";
import {
  openInITerm,
  openInPreferredApp,
  openInVSCode,
  openInWebStorm,
  revealInFinder,
  OpenActionError,
} from "./lib/openActions";
import ManageAppPathsCommand from "./manage-app-paths";

function toDisplayPath(absolutePath: string): string {
  const home = os.homedir();
  return absolutePath.startsWith(home) ? `~${absolutePath.slice(home.length)}` : absolutePath;
}

function relativeTime(timestampMs: number): string {
  if (!timestampMs) return "Unknown";
  const diffMs = Date.now() - timestampMs;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.round(months / 12);
  return `${years}y ago`;
}

async function loadEverything(): Promise<{ projects: ProjectEntity[]; store: AppPathStore }> {
  const prefs = getPreferenceValues<Preferences.ListProjects>();

  const configuredRoots = [
    expandHome(prefs.developmentPath ?? ""),
    ...parseCommaSeparated(prefs.customProjectDirectories).map(expandHome),
  ].filter((root) => root.length > 0);

  const roots = configuredRoots.length > 0 ? configuredRoots : detectDefaultRoots();

  const excludeNames = new Set(
    parseCommaSeparated(
      prefs.excludeFolderNames ??
        "node_modules,.git,DerivedData,build,dist,.build,Pods,.gradle,.idea,.vscode",
    ),
  );

  const maxDepth = Number.parseInt(prefs.scanDepth ?? "2", 10) || 2;

  const [projects, store] = await Promise.all([
    Promise.resolve(scanForProjects({ roots, maxDepth, excludeNames })),
    loadAppPathStore(),
  ]);

  return { projects, store };
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences.ListProjects>();
  const { data, isLoading, revalidate } = usePromise(loadEverything, []);
  const [searchText, setSearchText] = useState("");

  const projects = data?.projects ?? [];
  const store = data?.store ?? {};

  const filtered = useMemo(() => {
    if (!searchText.trim()) return projects;
    const needle = searchText.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.typeLabel.toLowerCase().includes(needle) ||
        p.path.toLowerCase().includes(needle),
    );
  }, [projects, searchText]);

  const grouped = useMemo(() => {
    const map = new Map<string, ProjectEntity[]>();
    for (const project of filtered) {
      const key = toDisplayPath(project.sourceRoot);
      const list = map.get(key) ?? [];
      list.push(project);
      map.set(key, list);
    }
    return map;
  }, [filtered]);

  function fallbackFor(target: EditorTarget): string {
    switch (target) {
      case "preferred":
      case "vscode":
        return prefs.defaultVSCodePath ?? "code";
      case "webstorm":
        return prefs.defaultWebStormPath ?? "webstorm";
      case "iterm":
        return prefs.defaultITermPath ?? "/Applications/iTerm.app";
    }
  }

  function preferredAppName(project: ProjectEntity): string {
    return appDisplayName(
      resolveAppPath(store, project.type, "preferred", fallbackFor("preferred")),
    );
  }

  async function handleOpen(project: ProjectEntity, target: EditorTarget) {
    const resolvedPath = resolveAppPath(store, project.type, target, fallbackFor(target));

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Opening ${project.name}…`,
    });

    try {
      if (target === "preferred") await openInPreferredApp(project.path, resolvedPath);
      else if (target === "vscode") await openInVSCode(project.path, resolvedPath);
      else if (target === "webstorm") await openInWebStorm(project.path, resolvedPath);
      else await openInITerm(project.path, resolvedPath);

      toast.style = Toast.Style.Success;
      toast.title = `Opened ${project.name}`;
      await closeMainWindow({ clearRootSearch: true });
    } catch (error) {
      toast.style = Toast.Style.Failure;
      if (error instanceof OpenActionError) {
        toast.title = `Couldn't open in ${labelForTarget(target)}`;
        toast.message = error.message;
      } else {
        toast.title = "Something went wrong";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    }
  }

  function labelForTarget(target: EditorTarget): string {
    switch (target) {
      case "preferred":
        return "the preferred app";
      case "vscode":
        return "VS Code";
      case "webstorm":
        return "WebStorm";
      case "iterm":
        return "iTerm";
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects by name, type, or path…"
      onSearchTextChange={setSearchText}
      throttle
    >
      {grouped.size === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No projects found"
          description="Check your Development Root Directory and Additional Project Directories in preferences."
          actions={
            <ActionPanel>
              <Action title="Rescan Projects" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action.Open
                title="Open Extension Preferences"
                target="raycast://extensions/preferences"
                icon={Icon.Gear}
              />
            </ActionPanel>
          }
        />
      ) : (
        Array.from(grouped.entries()).map(([root, items]) => (
          <List.Section
            key={root}
            title={root}
            subtitle={`${items.length} project${items.length === 1 ? "" : "s"}`}
          >
            {items.map((project) => (
              <List.Item
                key={project.path}
                icon={iconForProjectType(project.type)}
                title={project.name}
                subtitle={toDisplayPath(path.dirname(project.path))}
                accessories={[
                  ...(project.isGitRepo
                    ? [{ icon: Icon.CodeBlock, tooltip: "Git repository" }]
                    : []),
                  { tag: { value: project.typeLabel, color: Color.SecondaryText } },
                  { text: relativeTime(project.lastModified), tooltip: "Last modified" },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Open Project">
                      <Action
                        title={`Open in ${preferredAppName(project)}`}
                        icon={Icon.Rocket}
                        onAction={() => handleOpen(project, "preferred")}
                      />
                      <Action
                        title="Open in VS Code"
                        icon={Icon.Code}
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                        onAction={() => handleOpen(project, "vscode")}
                      />
                      <Action
                        // eslint-disable-next-line @raycast/prefer-title-case -- "WebStorm" is the correct brand capitalization
                        title="Open in WebStorm"
                        icon={Icon.Hammer}
                        shortcut={{ modifiers: ["cmd"], key: "w" }}
                        onAction={() => handleOpen(project, "webstorm")}
                      />
                      <Action
                        title="Open in iTerm"
                        icon={Icon.Terminal}
                        shortcut={{ modifiers: ["cmd"], key: "t" }}
                        onAction={() => handleOpen(project, "iterm")}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Manage">
                      <Action
                        title="Reveal in Finder"
                        icon={Icon.Finder}
                        shortcut={{ modifiers: ["cmd"], key: "f" }}
                        onAction={() => revealInFinder(project.path)}
                      />
                      <Action.CopyToClipboard
                        title="Copy Path"
                        content={project.path}
                        shortcut={Keyboard.Shortcut.Common.Copy}
                      />
                      <Action.OpenWith
                        path={project.path}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                      />
                      <Action
                        title="Rescan Projects"
                        icon={Icon.ArrowClockwise}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={revalidate}
                      />
                      <Action.Push
                        title="Manage App Paths"
                        icon={Icon.WrenchScrewdriver}
                        shortcut={{ modifiers: ["cmd"], key: "p" }}
                        target={<ManageAppPathsCommand />}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
