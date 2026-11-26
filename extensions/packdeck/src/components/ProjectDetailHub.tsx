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
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { DependencyKind, ExtensionPreferences, LocalProject, ProjectDependency } from "../types";
import { DEPENDENCY_KIND_META, PACKAGE_MANAGER_META } from "../lib/constants";
import { formatDuration, formatPathForDisplay } from "../lib/format";
import { notifyOperationResult } from "../lib/notifications";
import {
  buildInstallCommand,
  executeInstall,
  executeReinstall,
  executeUninstall,
  executeUpdate,
} from "../lib/package-manager";
import { readProjectAt } from "../lib/projects";
import { getFavorites, toggleFavorite } from "../lib/storage";
import { runCommandInTerminal } from "../lib/terminal";
import { InstallPackageForm } from "./InstallPackageForm";
import { PackageDetailView } from "./PackageDetailView";
import { ProjectAuditList } from "./ProjectAuditList";
import { ProjectOutdatedList } from "./ProjectOutdatedList";
import { ProjectScriptsList } from "./ProjectScriptsList";

interface ProjectDetailHubProps {
  project: LocalProject;
  onProjectChanged?: () => unknown;
}

type DepFilter = "all" | DependencyKind;

export function ProjectDetailHub({ project: initialProject, onProjectChanged }: ProjectDetailHubProps) {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const [filter, setFilter] = useState<DepFilter>("all");
  const [refreshTick, setRefreshTick] = useState(0);

  const project = useMemo(() => {
    void refreshTick;
    return (
      readProjectAt(initialProject.path, {
        defaultPackageManager: prefs.defaultPackageManager,
      }) ?? initialProject
    );
  }, [initialProject, prefs.defaultPackageManager, refreshTick]);

  const { data: favorites, revalidate: revalidateFavs } = usePromise(getFavorites);
  const favNames = useMemo(() => new Set((favorites ?? []).map((f) => f.name)), [favorites]);

  async function refreshProject() {
    setRefreshTick((t) => t + 1);
    await onProjectChanged?.();
  }

  const filteredDeps = useMemo(() => {
    if (filter === "all") return project.dependencies;
    return project.dependencies.filter((d) => d.kind === filter);
  }, [project.dependencies, filter]);

  const pmMeta = PACKAGE_MANAGER_META[project.packageManager];

  async function handleReinstallAll() {
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
      title: outcome.success ? `Reinstalled ${project.name}` : "Reinstall failed",
      message: outcome.success ? `${outcome.command} · ${formatDuration(outcome.durationMs)}` : outcome.errorMessage,
      success: outcome.success,
      durationMs: outcome.durationMs,
    });

    if (outcome.success) await refreshProject();
  }

  async function handleUpdateDep(dep: ProjectDependency, latest: boolean) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Updating ${dep.name}...`,
      message: project.name,
    });

    const outcome = await executeUpdate({
      pm: project.packageManager,
      packages: [latest ? `${dep.name}@latest` : dep.name],
      projectPath: project.path,
      projectName: project.name,
      latest,
      additionalPath: prefs.additionalPath,
    });

    await toast.hide();
    await notifyOperationResult({
      title: outcome.success ? `Updated ${dep.name}` : `Failed to update ${dep.name}`,
      message: outcome.success ? `${outcome.command} · ${formatDuration(outcome.durationMs)}` : outcome.errorMessage,
      success: outcome.success,
      durationMs: outcome.durationMs,
    });

    if (outcome.success) await refreshProject();
  }

  async function handleReinstallDep(dep: ProjectDependency) {
    const depType =
      dep.kind === "devDependencies"
        ? "dev"
        : dep.kind === "optionalDependencies"
          ? "optional"
          : dep.kind === "peerDependencies"
            ? "peer"
            : "prod";

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Reinstalling ${dep.name}...`,
    });

    const outcome = await executeReinstall({
      pm: project.packageManager,
      packageName: dep.name,
      depType,
      projectPath: project.path,
      projectName: project.name,
      additionalPath: prefs.additionalPath,
    });

    await toast.hide();
    await notifyOperationResult({
      title: outcome.success ? `Reinstalled ${dep.name}` : `Reinstall failed`,
      message: outcome.success ? formatDuration(outcome.durationMs) : outcome.errorMessage,
      success: outcome.success,
      durationMs: outcome.durationMs,
    });

    if (outcome.success) await refreshProject();
  }

  async function handleMoveDepType(dep: ProjectDependency) {
    const targetType = dep.kind === "devDependencies" ? "prod" : "dev";
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Moving ${dep.name} to ${targetType === "dev" ? "devDependencies" : "dependencies"}...`,
    });

    const rm = await executeUninstall({
      pm: project.packageManager,
      packageName: dep.name,
      projectPath: project.path,
      projectName: project.name,
      additionalPath: prefs.additionalPath,
    });

    if (!rm.success) {
      await toast.hide();
      await notifyOperationResult({
        title: `Could not move ${dep.name}`,
        message: rm.errorMessage,
        success: false,
      });
      return;
    }

    const add = await executeInstall({
      pm: project.packageManager,
      packageName: dep.name,
      version: dep.installedVersion,
      projectPath: project.path,
      projectName: project.name,
      depType: targetType,
      additionalPath: prefs.additionalPath,
    });

    await toast.hide();
    await notifyOperationResult({
      title: add.success ? `Moved ${dep.name} to ${targetType}` : `Failed to reinstall ${dep.name}`,
      message: add.success ? add.command : add.errorMessage,
      success: add.success,
      durationMs: rm.durationMs + add.durationMs,
    });

    if (add.success) await refreshProject();
  }

  async function handleUninstallDep(dep: ProjectDependency) {
    const confirmed = await confirmAlert({
      title: `Uninstall ${dep.name}?`,
      message: `Remove "${dep.name}" from ${project.name} using ${pmMeta.label}?`,
      primaryAction: { title: "Uninstall", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Uninstalling ${dep.name}...`,
    });

    const outcome = await executeUninstall({
      pm: project.packageManager,
      packageName: dep.name,
      projectPath: project.path,
      projectName: project.name,
      additionalPath: prefs.additionalPath,
    });

    await toast.hide();
    await notifyOperationResult({
      title: outcome.success ? `Uninstalled ${dep.name}` : `Uninstall failed`,
      message: outcome.success ? `${project.name} · ${formatDuration(outcome.durationMs)}` : outcome.errorMessage,
      success: outcome.success,
      durationMs: outcome.durationMs,
    });

    if (outcome.success) await refreshProject();
  }

  async function handleToggleFav(dep: ProjectDependency) {
    const res = await toggleFavorite({
      name: dep.name,
      description: "",
      version: dep.installedVersion ?? dep.declaredRange,
      links: { npm: `https://www.npmjs.com/package/${dep.name}` },
    });
    await revalidateFavs();
    await showToast({
      style: Toast.Style.Success,
      title: res.isFavorite ? `Added ${dep.name} to Favorites` : `Removed ${dep.name} from Favorites`,
    });
  }

  async function openInEditor() {
    if (prefs.preferredEditor?.path) {
      await open(project.path, prefs.preferredEditor.path);
    } else {
      await open(project.path);
    }
  }

  return (
    <List
      navigationTitle={`${project.name} (${pmMeta.label})`}
      searchBarPlaceholder={`Filter ${project.counts.total} dependencies or tools in ${project.name}...`}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Dependencies" value={filter} onChange={(v) => setFilter(v as DepFilter)}>
          <List.Dropdown.Item title={`All Dependencies (${project.counts.total})`} value="all" />
          <List.Dropdown.Item title={`Dependencies (${project.counts.dependencies})`} value="dependencies" />
          <List.Dropdown.Item title={`Dev Dependencies (${project.counts.devDependencies})`} value="devDependencies" />
          <List.Dropdown.Item
            title={`Peer Dependencies (${project.counts.peerDependencies})`}
            value="peerDependencies"
          />
          <List.Dropdown.Item
            title={`Optional Dependencies (${project.counts.optionalDependencies})`}
            value="optionalDependencies"
          />
        </List.Dropdown>
      }
    >
      <List.Section
        title="Project Hub"
        subtitle={`${formatPathForDisplay(project.path)} · ${pmMeta.label}${project.lockfileName ? ` (${project.lockfileName})` : ""}`}
      >
        <List.Item
          icon={{ source: Icon.Download, tintColor: Color.Green }}
          title="Install New Package"
          subtitle={`Add a dependency to ${project.name}`}
          accessories={[{ tag: { value: pmMeta.label, color: pmMeta.color } }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Install Package…"
                icon={Icon.Download}
                target={<InstallPackageForm defaultProject={project} onSuccess={refreshProject} />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.ArrowUpCircle, tintColor: Color.Orange }}
          title="Check Outdated Dependencies"
          subtitle="Compare installed, wanted, and latest versions"
          actions={
            <ActionPanel>
              <Action.Push
                title="Check Outdated Packages"
                icon={Icon.ArrowUpCircle}
                target={<ProjectOutdatedList project={project} isNested onUpdated={refreshProject} />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Shield, tintColor: Color.Red }}
          title="Run Security Audit"
          subtitle="Scan for known vulnerabilities and remediation fixes"
          actions={
            <ActionPanel>
              <Action.Push
                title="Run Security Audit"
                icon={Icon.Shield}
                target={<ProjectAuditList project={project} isNested />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Terminal, tintColor: Color.Blue }}
          title="Run Project Scripts"
          subtitle={`${project.scripts.length} script${project.scripts.length === 1 ? "" : "s"} in package.json`}
          accessories={project.scripts.slice(0, 3).map((s) => ({ tag: s.name }))}
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Script Runner"
                icon={Icon.Terminal}
                target={<ProjectScriptsList project={project} isNested />}
              />
              <Action
                title={`Open Project in ${prefs.preferredTerminal ?? "Terminal"}`}
                icon={Icon.Window}
                onAction={() =>
                  runCommandInTerminal(project.path, { bin: "pwd", args: [] }, prefs.preferredTerminal ?? "Terminal")
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.ArrowClockwise, tintColor: Color.Purple }}
          title={`Reinstall All Dependencies (${project.packageManager} install)`}
          subtitle="Sync node_modules with package.json and lockfile"
          actions={
            <ActionPanel>
              <Action title="Reinstall All Dependencies" icon={Icon.ArrowClockwise} onAction={handleReinstallAll} />
              <Action
                title={prefs.preferredEditor ? `Open in ${prefs.preferredEditor.name}` : "Open Folder"}
                icon={Icon.Code}
                onAction={openInEditor}
              />
              <Action.Open title="Open Package.json" target={project.packageJsonPath} />
              <Action.ShowInFinder path={project.path} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section
        title="Installed Dependencies"
        subtitle={`${filteredDeps.length} shown · ${project.counts.dependencies} prod, ${project.counts.devDependencies} dev, ${project.counts.peerDependencies} peer`}
      >
        {filteredDeps.map((dep) => {
          const kindMeta = DEPENDENCY_KIND_META[dep.kind];
          const isFav = favNames.has(dep.name);

          return (
            <List.Item
              key={`${dep.kind}-${dep.name}`}
              icon={{ source: Icon.Box, tintColor: kindMeta.color }}
              title={dep.name}
              subtitle={dep.declaredRange}
              accessories={[
                ...(isFav ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Favorite" }] : []),
                {
                  text: dep.installedVersion ? `installed ${dep.installedVersion}` : "not installed",
                  tooltip: dep.installedVersion
                    ? `Installed in node_modules: v${dep.installedVersion}`
                    : "Not found in node_modules",
                },
                { tag: { value: kindMeta.shortLabel, color: kindMeta.color } },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Inspect">
                    <Action.Push
                      title="View Package Details & README"
                      icon={Icon.Document}
                      target={
                        <PackageDetailView packageName={dep.name} activeProject={project} onMutated={refreshProject} />
                      }
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Manage Dependency">
                    <Action
                      title="Update to Wanted"
                      icon={Icon.ArrowUpCircle}
                      shortcut={{ modifiers: ["cmd"], key: "u" }}
                      onAction={() => handleUpdateDep(dep, false)}
                    />
                    <Action
                      title="Upgrade to Latest"
                      icon={Icon.Upload}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                      onAction={() => handleUpdateDep(dep, true)}
                    />
                    <Action.Push
                      title="Install Specific Version…"
                      icon={Icon.Tag}
                      shortcut={{ modifiers: ["cmd"], key: "v" }}
                      target={
                        <InstallPackageForm
                          packageName={dep.name}
                          initialVersion={dep.installedVersion ?? "latest"}
                          defaultProject={project}
                          defaultDepType={dep.kind === "devDependencies" ? "dev" : "prod"}
                          onSuccess={refreshProject}
                        />
                      }
                    />
                    <Action
                      title="Reinstall Package"
                      icon={Icon.ArrowClockwise}
                      onAction={() => handleReinstallDep(dep)}
                    />
                    {(dep.kind === "dependencies" || dep.kind === "devDependencies") && (
                      <Action
                        title={
                          dep.kind === "devDependencies" ? "Move to Dependencies (Prod)" : "Move to Dev Dependencies"
                        }
                        icon={Icon.Switch}
                        onAction={() => handleMoveDepType(dep)}
                      />
                    )}
                    <Action
                      title="Uninstall Package"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => handleUninstallDep(dep)}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Favorites & Links">
                    <Action
                      title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                      icon={isFav ? Icon.StarDisabled : Icon.Star}
                      shortcut={{ modifiers: ["cmd"], key: "f" }}
                      onAction={() => handleToggleFav(dep)}
                    />
                    <Action.CopyToClipboard
                      title="Copy Install Command"
                      content={
                        buildInstallCommand(project.packageManager, dep.name, {
                          depType: dep.kind === "devDependencies" ? "dev" : "prod",
                        }).display
                      }
                    />
                    <Action.OpenInBrowser title="Open on npm" url={`https://www.npmjs.com/package/${dep.name}`} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
