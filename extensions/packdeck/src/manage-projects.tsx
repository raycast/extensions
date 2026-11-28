import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  getPreferenceValues,
  Icon,
  List,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { AddProjectForm } from "./components/AddProjectForm";
import { InstallPackageForm } from "./components/InstallPackageForm";
import { ProjectAuditList } from "./components/ProjectAuditList";
import { ProjectDetailHub } from "./components/ProjectDetailHub";
import { ProjectOutdatedList } from "./components/ProjectOutdatedList";
import { ProjectScriptsList } from "./components/ProjectScriptsList";
import { PACKAGE_MANAGER_META } from "./lib/constants";
import { formatDuration, formatPathForDisplay, formatRelativeTime } from "./lib/format";
import { notifyOperationResult } from "./lib/notifications";
import { executeReinstall } from "./lib/package-manager";
import { removeCustomProjectPath, togglePinnedProject } from "./lib/storage";
import { runCommandInTerminal } from "./lib/terminal";
import { useProjects } from "./lib/useProjects";
import { LocalProject, PackageManagerName, TerminalApp } from "./types";

type ProjectFilter = "all" | "pinned" | PackageManagerName;

export default function ManageProjectsCommand() {
  const prefs = getPreferenceValues<Preferences>();
  const { projects, activeProjectPath, selectActiveProject, isLoading, revalidate } = useProjects();
  const [filter, setFilter] = useState<ProjectFilter>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return projects;
    if (filter === "pinned") return projects.filter((p) => p.isPinned);
    return projects.filter((p) => p.packageManager === filter);
  }, [projects, filter]);

  async function handleSetActive(project: LocalProject) {
    await selectActiveProject(project.path);
    await showToast({
      style: Toast.Style.Success,
      title: `Active project: ${project.name}`,
      message: PACKAGE_MANAGER_META[project.packageManager].label,
    });
  }

  async function handleTogglePin(project: LocalProject) {
    const res = await togglePinnedProject(project.path);
    await revalidate();
    await showToast({
      style: Toast.Style.Success,
      title: res.pinned ? `Pinned ${project.name}` : `Unpinned ${project.name}`,
    });
  }

  async function handleReinstall(project: LocalProject) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Running ${project.packageManager} install...`,
      message: project.name,
    });

    const outcome = await executeReinstall({
      pm: project.packageManager,
      projectPath: project.path,
      projectName: project.name,
      additionalPath: prefs.additionalPath,
    });

    await toast.hide();
    await notifyOperationResult({
      title: outcome.success ? `Installed dependencies in ${project.name}` : `Install failed`,
      message: outcome.success ? `${outcome.command} · ${formatDuration(outcome.durationMs)}` : outcome.errorMessage,
      success: outcome.success,
      durationMs: outcome.durationMs,
    });

    if (outcome.success) await revalidate();
  }

  async function handleRemoveCustom(project: LocalProject) {
    const ok = await confirmAlert({
      title: `Remove "${project.name}" from custom projects?`,
      message: "This only removes the project bookmark from Packdeck; no files on disk are deleted.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;

    await removeCustomProjectPath(project.path);
    await revalidate();
    await showToast({ style: Toast.Style.Success, title: `Removed ${project.name} from custom projects` });
  }

  async function openInEditor(project: LocalProject) {
    if (prefs.preferredEditor?.path) {
      await open(project.path, prefs.preferredEditor.path);
    } else {
      await open(project.path);
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search local projects by name, path, or package manager..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Projects" value={filter} onChange={(v) => setFilter(v as ProjectFilter)}>
          <List.Dropdown.Item title={`All Projects (${projects.length})`} value="all" />
          <List.Dropdown.Item title="Pinned" value="pinned" icon={Icon.Pin} />
          <List.Dropdown.Section title="Package Manager">
            <List.Dropdown.Item title="npm" value="npm" />
            <List.Dropdown.Item title="pnpm" value="pnpm" />
            <List.Dropdown.Item title="Yarn" value="yarn" />
            <List.Dropdown.Item title="Bun" value="bun" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {!isLoading && filtered.length === 0 ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No Projects Discovered"
          description="Add a local folder containing package.json or configure Project Directories in Packdeck preferences."
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Local Project…"
                icon={Icon.Plus}
                target={<AddProjectForm onAdded={revalidate} />}
              />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action title="Rescan Directories" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="Local Projects" subtitle={`${filtered.length} discovered`}>
          {filtered.map((project) => {
            const pmMeta = PACKAGE_MANAGER_META[project.packageManager];
            const isActive = project.path === activeProjectPath;

            return (
              <List.Item
                key={project.id}
                icon={{
                  source: project.isPinned ? Icon.Pin : isActive ? Icon.Star : Icon.Folder,
                  tintColor: isActive ? Color.Yellow : pmMeta.color,
                }}
                title={project.name}
                subtitle={formatPathForDisplay(project.path)}
                keywords={[project.packageManager, project.path, project.description ?? ""]}
                accessories={[
                  ...(isActive ? [{ tag: { value: "Active", color: Color.Green } }] : []),
                  ...(project.isMonorepo ? [{ tag: { value: "Workspace", color: Color.Purple } }] : []),
                  {
                    text: `${project.counts.total} deps · ${project.scripts.length} scripts`,
                    tooltip: `Updated ${formatRelativeTime(project.lastModified)}`,
                  },
                  {
                    tag: { value: pmMeta.label, color: pmMeta.color },
                    tooltip: project.lockfileName
                      ? `Detected via ${project.lockfileName}`
                      : `Detected via ${project.packageManagerSource}`,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Open Project">
                      <Action.Push
                        title="Open Project Hub & Dependencies"
                        icon={Icon.Box}
                        target={<ProjectDetailHub project={project} onProjectChanged={revalidate} />}
                        onPush={() => void selectActiveProject(project.path)}
                      />
                      {!isActive && (
                        <Action
                          title="Set as Active Project"
                          icon={Icon.Star}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                          onAction={() => handleSetActive(project)}
                        />
                      )}
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Project Workflows">
                      <Action.Push
                        title="Install Package into Project…"
                        icon={Icon.Download}
                        shortcut={{ modifiers: ["cmd"], key: "i" }}
                        target={<InstallPackageForm defaultProject={project} onSuccess={revalidate} />}
                      />
                      <Action.Push
                        title="Check Outdated Packages"
                        icon={Icon.ArrowUpCircle}
                        shortcut={{ modifiers: ["cmd"], key: "u" }}
                        target={<ProjectOutdatedList project={project} isNested onUpdated={revalidate} />}
                      />
                      <Action.Push
                        title="Run Security Audit"
                        icon={Icon.Shield}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                        target={<ProjectAuditList project={project} isNested />}
                      />
                      <Action.Push
                        title="Run Project Scripts"
                        icon={Icon.Terminal}
                        shortcut={{ modifiers: ["cmd", "opt"], key: "r" }}
                        target={<ProjectScriptsList project={project} isNested />}
                      />
                      <Action
                        title="Reinstall All Dependencies"
                        icon={Icon.ArrowClockwise}
                        onAction={() => handleReinstall(project)}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Open & Organize">
                      <Action
                        title={prefs.preferredEditor ? `Open in ${prefs.preferredEditor.name}` : "Open in Default App"}
                        icon={Icon.Code}
                        shortcut={Keyboard.Shortcut.Common.Open}
                        onAction={() => openInEditor(project)}
                      />
                      <Action
                        title={`Open in ${prefs.preferredTerminal ?? "Terminal"}`}
                        icon={Icon.Window}
                        shortcut={{ modifiers: ["cmd"], key: "t" }}
                        onAction={() =>
                          runCommandInTerminal(
                            project.path,
                            { bin: "ls", args: ["-la"], display: "ls -la" },
                            (prefs.preferredTerminal as TerminalApp) ?? "Terminal",
                          )
                        }
                      />
                      <Action.Open title="Open Package.json" target={project.packageJsonPath} />
                      <Action.ShowInFinder path={project.path} />
                      <Action.CopyToClipboard title="Copy Project Path" content={project.path} />
                      <Action
                        title={project.isPinned ? "Unpin Project" : "Pin Project"}
                        icon={project.isPinned ? Icon.PinDisabled : Icon.Pin}
                        shortcut={Keyboard.Shortcut.Common.Pin}
                        onAction={() => handleTogglePin(project)}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Workspace Discovery">
                      <Action.Push
                        title="Add Custom Project…"
                        icon={Icon.Plus}
                        shortcut={Keyboard.Shortcut.Common.New}
                        target={<AddProjectForm onAdded={revalidate} />}
                      />
                      {project.isCustom && (
                        <Action
                          title="Remove Custom Project"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          onAction={() => handleRemoveCustom(project)}
                        />
                      )}
                      <Action
                        title="Rescan Project Directories"
                        icon={Icon.ArrowClockwise}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        onAction={revalidate}
                      />
                      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
