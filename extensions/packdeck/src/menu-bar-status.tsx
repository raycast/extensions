import {
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  openCommandPreferences,
  openExtensionPreferences,
  showHUD,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { PACKAGE_MANAGER_META } from "./lib/constants";
import { formatRelativeTime, truncateText } from "./lib/format";
import { notifyBackgroundHealthChanges, resolveProjectHealthSnapshot } from "./lib/notifications";
import { checkProjectOutdated, runProjectSecurityAudit } from "./lib/package-manager";
import { discoverLocalProjects } from "./lib/projects";
import {
  getActiveProjectPath,
  getCustomProjectPaths,
  getLastHealthSnapshots,
  getPinnedProjectPaths,
  saveHealthSnapshots,
  setActiveProjectPath,
} from "./lib/storage";
import { PackageManagerName, ProjectHealthSnapshot } from "./types";

async function collectHealthSnapshots(prefs: Preferences): Promise<ProjectHealthSnapshot[]> {
  const [activePath, customPaths, pinnedPaths, previousSnapshots] = await Promise.all([
    getActiveProjectPath(),
    getCustomProjectPaths(),
    getPinnedProjectPaths(),
    getLastHealthSnapshots(),
  ]);

  const scanDepth = Number.parseInt(prefs.scanDepth ?? "3", 10) || 3;
  const projects = discoverLocalProjects({
    projectDirectoriesPref: prefs.projectDirectories,
    scanDepth,
    customPaths,
    pinnedPaths,
    activeProjectPath: activePath,
    defaultPackageManager: (prefs.defaultPackageManager as PackageManagerName | "auto" | undefined) ?? "auto",
  });

  // Monitor up to 3 highest-priority projects (pinned & active first) to keep background refresh lightweight
  const watched = projects.slice(0, 3);
  if (watched.length === 0) return [];

  const snapshots = await Promise.all(
    watched.map(async (project): Promise<ProjectHealthSnapshot> => {
      const [outdatedResult, auditResult] = await Promise.allSettled([
        checkProjectOutdated(project, {
          registryUrl: prefs.registryUrl,
          additionalPath: prefs.additionalPath,
        }),
        runProjectSecurityAudit(project, {
          registryUrl: prefs.registryUrl,
          additionalPath: prefs.additionalPath,
        }),
      ]);

      return resolveProjectHealthSnapshot({
        projectPath: project.path,
        projectName: project.name,
        packageManager: project.packageManager,
        previous: previousSnapshots[project.path],
        outdatedResult,
        auditResult,
      });
    }),
  );

  await notifyBackgroundHealthChanges(snapshots, previousSnapshots);

  const nextMap: Record<string, ProjectHealthSnapshot> = {};
  for (const snap of snapshots) {
    nextMap[snap.projectPath] = snap;
  }
  await saveHealthSnapshots(nextMap);

  return snapshots;
}

export default function MenuBarStatusCommand() {
  const prefs = getPreferenceValues<Preferences>();

  const {
    data: snapshots,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(async () => collectHealthSnapshots(prefs), [], {
    keepPreviousData: true,
  });

  const list = snapshots ?? [];
  const totalOutdated = list.reduce((sum, s) => sum + s.outdatedCount, 0);
  const totalVulns = list.reduce((sum, s) => sum + s.vulnerabilityCount, 0);
  const failedCount = list.filter((s) => Boolean(s.lastError)).length;
  const lastChecked = list[0]?.checkedAt;

  let badgeTitle: string | undefined;
  if (totalVulns > 0) {
    badgeTitle = `!${totalVulns}`;
  } else if (failedCount > 0 || error) {
    badgeTitle = "!";
  } else if (totalOutdated > 0) {
    badgeTitle = `↑${totalOutdated}`;
  }

  const failureSuffix = error ? " — refresh failed" : failedCount > 0 ? ` — ${failedCount} refresh failed` : "";

  const tooltip =
    list.length === 0
      ? error
        ? "Packdeck — Background refresh failed"
        : "Packdeck — No watched projects"
      : `Packdeck — ${totalOutdated} outdated, ${totalVulns} vulnerabilities across ${list.length} project(s)${failureSuffix}`;

  async function safeLaunch(commandName: string) {
    try {
      await launchCommand({ name: commandName, type: LaunchType.UserInitiated });
    } catch {
      await showHUD(`Could not open ${commandName}`);
    }
  }

  async function openProjectCommand(projectPath: string, commandName: string) {
    await setActiveProjectPath(projectPath);
    await safeLaunch(commandName);
  }

  return (
    <MenuBarExtra
      icon={{
        source: {
          light: "menu-bar-icon.png",
          dark: "menu-bar-icon@dark.png",
        },
      }}
      title={badgeTitle}
      tooltip={tooltip}
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title="Watched Projects">
        {error && (
          <MenuBarExtra.Item
            title={`Refresh failed: ${truncateText(error.message, 55)}`}
            icon={Icon.Warning}
            onAction={() => revalidate()}
          />
        )}
        {list.length === 0 ? (
          <MenuBarExtra.Item
            title="No Projects Discovered Yet"
            icon={Icon.Folder}
            onAction={() => safeLaunch("manage-projects")}
          />
        ) : (
          list.map((snap) => {
            const statusParts: string[] = [];
            if (snap.vulnerabilityCount > 0) statusParts.push(`${snap.vulnerabilityCount} vulns`);
            if (snap.outdatedCount > 0) statusParts.push(`${snap.outdatedCount} outdated`);
            if (snap.lastError) statusParts.push("Refresh failed");
            const subtitle =
              statusParts.length > 0
                ? statusParts.join(" · ")
                : `Healthy (${PACKAGE_MANAGER_META[snap.packageManager].label})`;

            return (
              <MenuBarExtra.Submenu
                key={snap.projectPath}
                title={`${snap.projectName} — ${subtitle}`}
                icon={
                  snap.vulnerabilityCount > 0
                    ? Icon.Shield
                    : snap.lastError
                      ? Icon.Warning
                      : snap.outdatedCount > 0
                        ? Icon.ArrowUpCircle
                        : Icon.CheckCircle
                }
              >
                {snap.lastError && (
                  <MenuBarExtra.Item
                    title={`Refresh failed (${truncateText(snap.lastError, 52)})`}
                    icon={Icon.Warning}
                    onAction={() => revalidate()}
                  />
                )}
                <MenuBarExtra.Item
                  title={`Outdated Packages (${snap.outdatedCount})`}
                  icon={Icon.ArrowUpCircle}
                  onAction={() => openProjectCommand(snap.projectPath, "outdated-packages")}
                />
                <MenuBarExtra.Item
                  title={`Security Audit (${snap.vulnerabilityCount})`}
                  icon={Icon.Shield}
                  onAction={() => openProjectCommand(snap.projectPath, "security-audit")}
                />
                <MenuBarExtra.Item
                  title="Run Project Scripts"
                  icon={Icon.Terminal}
                  onAction={() => openProjectCommand(snap.projectPath, "run-scripts")}
                />
                <MenuBarExtra.Item
                  title="Open in Manage Projects"
                  icon={Icon.Folder}
                  onAction={() => openProjectCommand(snap.projectPath, "manage-projects")}
                />
              </MenuBarExtra.Submenu>
            );
          })
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Quick Commands">
        <MenuBarExtra.Item
          title="Search npm Packages"
          icon={Icon.MagnifyingGlass}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={() => safeLaunch("search-packages")}
        />
        <MenuBarExtra.Item
          title="Manage Projects"
          icon={Icon.Folder}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
          onAction={() => safeLaunch("manage-projects")}
        />
        <MenuBarExtra.Item
          title="Manage Global Packages"
          icon={Icon.Globe}
          onAction={() => safeLaunch("global-packages")}
        />
        <MenuBarExtra.Item
          title="Favorites & History"
          icon={Icon.Star}
          onAction={() => safeLaunch("favorites-and-history")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={lastChecked ? `Refresh Now (${formatRelativeTime(lastChecked)})` : "Refresh Now"}
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => revalidate()}
        />
        <MenuBarExtra.Item title="Configure Preferences…" icon={Icon.Gear} onAction={openExtensionPreferences} />
        <MenuBarExtra.Item title="Configure Menu Bar Command…" icon={Icon.Cog} onAction={openCommandPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
