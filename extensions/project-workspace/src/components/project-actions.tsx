import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";

import { openProjectInApp, quickOpenProject, resolveProjectApps } from "../open";
import { confirmAndKillProcess } from "../runtime-actions";
import { getProjectTitle } from "../scanner";
import {
  PreferredApp,
  ProjectOverride,
  ProjectRecord,
  ResolvedProjectApp,
  RuntimeStatus,
  ScanRoot,
  StorageState,
} from "../types";
import { CleanupPreview } from "./cleanup-preview";
import { EditProjectForm } from "./edit-project-form";
import { ManageScanRootsForm } from "./manage-scan-roots-form";

interface ProjectActionsProps {
  project: ProjectRecord;
  runtimeStatus?: RuntimeStatus;
  scanRoots: ScanRoot[];
  defaultIdeApp: PreferredApp;
  defaultTerminalApp: PreferredApp;
  onProjectUpdated: (patch: ProjectOverride) => Promise<void> | void;
  onStateChanged: (state?: StorageState) => Promise<void> | void;
  onRefresh: () => Promise<void> | void;
}

export function ProjectActions({
  project,
  runtimeStatus,
  scanRoots,
  defaultIdeApp,
  defaultTerminalApp,
  onProjectUpdated,
  onStateChanged,
  onRefresh,
}: ProjectActionsProps) {
  const urls = Array.from(new Set([...project.urls, ...project.urlsFromPackageMetadata]));
  const { ideApp, terminalApp } = resolveProjectApps(project, defaultIdeApp, defaultTerminalApp);

  return (
    <ActionPanel title={getProjectTitle(project)}>
      <ActionPanel.Section title="Quick Open">
        <Action
          title={`Quick Open in ${ideApp.name} + ${terminalApp.name}`}
          icon={Icon.Rocket}
          onAction={() => void handleQuickOpen(project.path, ideApp, terminalApp)}
        />
        <Action
          title={`Open in ${ideApp.name}`}
          icon={{ fileIcon: ideApp.path }}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          onAction={() => void handleOpenInApp(project.path, ideApp, "IDE")}
        />
        <Action
          title={`Open in ${terminalApp.name}`}
          icon={{ fileIcon: terminalApp.path }}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          onAction={() => void handleOpenInApp(project.path, terminalApp, "terminal")}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Open title="Open Project" target={project.path} icon={Icon.Folder} />
        <Action.ShowInFinder path={project.path} />
        <Action.CopyToClipboard title="Copy Project Path" content={project.path} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Links">
        {project.gitRemotes.map((remote) => (
          <Action.OpenInBrowser
            key={`${remote.name}:${remote.url}`}
            title={`Open Git ${remote.name}`}
            url={remote.url}
          />
        ))}
        {urls.length === 1 ? (
          <Action.OpenInBrowser title="Open Project URL" url={urls[0]} />
        ) : urls.length > 1 ? (
          <ActionPanel.Submenu title="Open Project URL" icon={Icon.Link}>
            {urls.map((url) => (
              <Action.OpenInBrowser key={url} title={url} url={url} />
            ))}
          </ActionPanel.Submenu>
        ) : null}
      </ActionPanel.Section>
      <ActionPanel.Section title="Manage">
        <Action.Push
          title="Edit Project"
          icon={Icon.Pencil}
          target={<EditProjectForm project={project} onSaved={onProjectUpdated} />}
        />
        <Action
          title={project.pinned ? "Unpin Project" : "Pin Project"}
          icon={Icon.Pin}
          onAction={() => void onProjectUpdated({ pinned: !project.pinned })}
        />
        {project.archived ? (
          <Action
            title="Restore Project"
            icon={Icon.RotateClockwise}
            onAction={() => void onProjectUpdated({ archived: false })}
          />
        ) : (
          <Action.Push
            title="Archive and Clean Project"
            icon={Icon.Archive}
            target={<CleanupPreview project={project} archiveAfterCleanup onChanged={onStateChanged} />}
          />
        )}
      </ActionPanel.Section>
      {runtimeStatus?.processes.length ? (
        <ActionPanel.Section title="Runtime">
          {runtimeStatus.processes.map((runtimeProcess) => (
            <Action
              key={`${runtimeProcess.pid}:${runtimeProcess.port}`}
              title={`Stop Port ${runtimeProcess.port}`}
              icon={Icon.Stop}
              style={Action.Style.Destructive}
              onAction={() => void confirmAndKillProcess(runtimeProcess.pid, runtimeProcess.port, onRefresh)}
            />
          ))}
        </ActionPanel.Section>
      ) : null}
      <ActionPanel.Section title="Cleanup">
        <Action.Push
          title="Review Cleanup Candidates"
          icon={Icon.Trash}
          target={<CleanupPreview project={project} onChanged={onStateChanged} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Refresh">
        <Action title="Rescan All Projects" icon={Icon.ArrowClockwise} onAction={() => void onRefresh()} />
        <Action.Push
          title="Add Scan Directory"
          icon={Icon.Plus}
          target={<ManageScanRootsForm scanRoots={scanRoots} onSaved={onStateChanged} mode="add" />}
        />
        <Action.Push
          title="Manage Scan Roots"
          icon={Icon.Gear}
          target={<ManageScanRootsForm scanRoots={scanRoots} onSaved={onStateChanged} />}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

async function handleQuickOpen(projectPath: string, ideApp: ResolvedProjectApp, terminalApp: ResolvedProjectApp) {
  try {
    await quickOpenProject(projectPath, ideApp, terminalApp);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Unable to quick open project",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function handleOpenInApp(projectPath: string, app: PreferredApp, appKind: string) {
  try {
    await openProjectInApp(projectPath, app, true);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Unable to open in ${appKind}`,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
