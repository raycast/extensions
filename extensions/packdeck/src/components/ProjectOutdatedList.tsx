import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { LocalProject, OutdatedPackage, SemverBump } from "../types";
import { BUMP_META, DEPENDENCY_KIND_META, PACKAGE_MANAGER_META } from "../lib/constants";
import { formatDuration } from "../lib/format";
import { notifyOperationResult } from "../lib/notifications";
import { checkProjectOutdated, executeUpdate } from "../lib/package-manager";
import { PackageDetailView } from "./PackageDetailView";

interface ProjectOutdatedListProps {
  project: LocalProject;
  searchBarAccessory?: List.Props["searchBarAccessory"];
  isNested?: boolean;
  onUpdated?: () => unknown;
}

export function ProjectOutdatedList({
  project,
  searchBarAccessory,
  isNested = false,
  onUpdated,
}: ProjectOutdatedListProps) {
  const prefs = getPreferenceValues<Preferences>();
  const [bumpFilter, setBumpFilter] = useState<"all" | SemverBump>("all");

  const {
    data: outdated,
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async (proj: LocalProject) =>
      checkProjectOutdated(proj, {
        registryUrl: prefs.registryUrl,
        additionalPath: prefs.additionalPath,
      }),
    [project],
  );

  const items = useMemo(() => {
    const all = outdated ?? [];
    if (bumpFilter === "all") return all;
    return all.filter((item) => item.bump === bumpFilter);
  }, [outdated, bumpFilter]);

  const counts = useMemo(() => {
    const all = outdated ?? [];
    return {
      total: all.length,
      major: all.filter((i) => i.bump === "major").length,
      minor: all.filter((i) => i.bump === "minor").length,
      patch: all.filter((i) => i.bump === "patch").length,
    };
  }, [outdated]);

  async function updateSingle(pkg: OutdatedPackage, latest: boolean) {
    const targetVersion = latest ? pkg.latest : pkg.wanted;
    if (latest && pkg.bump === "major") {
      const ok = await confirmAlert({
        title: `Upgrade ${pkg.name} to major version ${pkg.latest}?`,
        message: `This upgrades ${pkg.name} from ${pkg.current} to ${pkg.latest} and may include breaking changes.`,
        primaryAction: { title: "Upgrade to Latest", style: Alert.ActionStyle.Destructive },
      });
      if (!ok) return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Updating ${pkg.name} → ${targetVersion}...`,
    });

    const outcome = await executeUpdate({
      pm: project.packageManager,
      packages: [latest ? `${pkg.name}@${pkg.latest}` : pkg.name],
      projectPath: project.path,
      projectName: project.name,
      latest,
      additionalPath: prefs.additionalPath,
    });

    await toast.hide();
    await notifyOperationResult({
      title: outcome.success ? `Updated ${pkg.name}` : `Failed to update ${pkg.name}`,
      message: outcome.success
        ? `${pkg.current} → ${targetVersion} · ${formatDuration(outcome.durationMs)}`
        : outcome.errorMessage,
      success: outcome.success,
      durationMs: outcome.durationMs,
    });

    if (outcome.success) {
      await revalidate();
      await onUpdated?.();
    }
  }

  async function updateAll(latest: boolean) {
    const all = outdated ?? [];
    if (all.length === 0) return;

    const ok = await confirmAlert({
      title: latest
        ? `Upgrade all ${all.length} packages to latest?`
        : `Update all ${all.length} packages to wanted versions?`,
      message: latest
        ? `Includes ${counts.major} major version upgrade(s) that could introduce breaking changes in ${project.name}.`
        : `Updates packages in ${project.name} within their declared package.json semver ranges.`,
      primaryAction: {
        title: latest ? "Upgrade All to Latest" : "Update All Wanted",
        style: latest ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
      },
    });
    if (!ok) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Updating ${all.length} packages in ${project.name}...`,
    });

    const outcome = await executeUpdate({
      pm: project.packageManager,
      packages: latest ? all.map((p) => `${p.name}@${p.latest}`) : [],
      projectPath: project.path,
      projectName: project.name,
      latest,
      additionalPath: prefs.additionalPath,
    });

    await toast.hide();
    await notifyOperationResult({
      title: outcome.success ? `Updated ${project.name}` : `Bulk update failed`,
      message: outcome.success ? `${outcome.command} · ${formatDuration(outcome.durationMs)}` : outcome.errorMessage,
      success: outcome.success,
      durationMs: outcome.durationMs,
    });

    if (outcome.success) {
      await revalidate();
      await onUpdated?.();
    }
  }

  const defaultDropdown = (
    <List.Dropdown
      tooltip="Filter by Semver Bump"
      value={bumpFilter}
      onChange={(v) => setBumpFilter(v as "all" | SemverBump)}
    >
      <List.Dropdown.Item title={`All Outdated (${counts.total})`} value="all" />
      <List.Dropdown.Item title={`Major (${counts.major})`} value="major" />
      <List.Dropdown.Item title={`Minor (${counts.minor})`} value="minor" />
      <List.Dropdown.Item title={`Patch (${counts.patch})`} value="patch" />
    </List.Dropdown>
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={isNested ? `Outdated — ${project.name}` : undefined}
      searchBarPlaceholder={`Filter outdated packages in ${project.name}...`}
      searchBarAccessory={searchBarAccessory ?? defaultDropdown}
    >
      {!isLoading && error ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Could Not Check Outdated Packages"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry Outdated Check" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : !isLoading && items.length === 0 ? (
        <List.EmptyView
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          title="All Dependencies Up to Date"
          description={`${project.name} (${PACKAGE_MANAGER_META[project.packageManager].label}) has no outdated packages${bumpFilter !== "all" ? ` matching "${bumpFilter}"` : ""}.`}
          actions={
            <ActionPanel>
              <Action title="Re-Check Outdated" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section
          title={`${project.name} · ${PACKAGE_MANAGER_META[project.packageManager].label}`}
          subtitle={`${counts.total} outdated (${counts.major} major, ${counts.minor} minor, ${counts.patch} patch)`}
        >
          {items.map((pkg) => {
            const bumpMeta = BUMP_META[pkg.bump];
            const kindLabel =
              pkg.dependencyType === "global"
                ? "global"
                : (DEPENDENCY_KIND_META[pkg.dependencyType]?.shortLabel ?? "dep");
            const hasWantedUpdate = pkg.wanted !== pkg.current;

            return (
              <List.Item
                key={pkg.name}
                icon={{ source: bumpMeta.icon, tintColor: bumpMeta.color }}
                title={pkg.name}
                subtitle={`${pkg.current} → ${pkg.latest}`}
                accessories={[
                  { tag: { value: kindLabel, color: Color.SecondaryText } },
                  ...(hasWantedUpdate && pkg.wanted !== pkg.latest
                    ? [{ text: `wanted ${pkg.wanted}`, tooltip: "Highest semver-compatible version" }]
                    : []),
                  { tag: { value: bumpMeta.label, color: bumpMeta.color } },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Update Package">
                      {hasWantedUpdate ? (
                        <Action
                          title={`Update to Wanted (${pkg.wanted})`}
                          icon={Icon.ArrowUpCircle}
                          onAction={() => updateSingle(pkg, false)}
                        />
                      ) : null}
                      <Action
                        title={`Upgrade to Latest (${pkg.latest})`}
                        icon={Icon.Upload}
                        shortcut={{ modifiers: ["cmd"], key: "u" }}
                        onAction={() => updateSingle(pkg, true)}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Bulk Updates">
                      <Action
                        title={`Update All Wanted (${counts.total})`}
                        icon={Icon.CheckList}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                        onAction={() => updateAll(false)}
                      />
                      <Action
                        title={`Upgrade All to Latest (${counts.total})`}
                        icon={Icon.ExclamationMark}
                        style={Action.Style.Destructive}
                        onAction={() => updateAll(true)}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Inspect">
                      <Action.Push
                        title="View Package Details & Changelog"
                        icon={Icon.Document}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                        target={
                          <PackageDetailView packageName={pkg.name} activeProject={project} onMutated={revalidate} />
                        }
                      />
                      <Action.OpenInBrowser title="Open on npm" url={`https://www.npmjs.com/package/${pkg.name}`} />
                      <Action
                        title="Refresh Outdated Check"
                        icon={Icon.ArrowClockwise}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        onAction={revalidate}
                      />
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
