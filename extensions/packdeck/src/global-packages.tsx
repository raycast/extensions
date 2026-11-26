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
import { InstallPackageForm } from "./components/InstallPackageForm";
import { PackageDetailView } from "./components/PackageDetailView";
import { BUMP_META, PACKAGE_MANAGER_META } from "./lib/constants";
import { detectInstalledPackageManagers } from "./lib/env";
import { formatDuration } from "./lib/format";
import { notifyOperationResult } from "./lib/notifications";
import {
  buildInstallCommand,
  executeReinstall,
  executeUninstall,
  executeUpdate,
  listGlobalPackages,
} from "./lib/package-manager";
import { getFavorites, toggleFavorite } from "./lib/storage";
import { ExtensionPreferences, GlobalPackage, PackageManagerName } from "./types";

type ManagerFilter = "all" | PackageManagerName;

export default function GlobalPackagesCommand() {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const [managerFilter, setManagerFilter] = useState<ManagerFilter>("all");

  const { data: managersInfo, isLoading: loadingManagers } = usePromise(
    async (extraPath: string) => detectInstalledPackageManagers(extraPath),
    [prefs.additionalPath ?? ""],
  );

  const installedManagers = useMemo(
    () => (managersInfo ?? []).filter((m) => m.installed).map((m) => m.name),
    [managersInfo],
  );

  const {
    data: globals,
    isLoading: loadingGlobals,
    revalidate,
  } = usePromise(
    async (managers: PackageManagerName[], filter: ManagerFilter) => {
      const targetManagers = filter === "all" ? managers : managers.includes(filter) ? [filter] : [];
      if (targetManagers.length === 0) return [];
      const lists = await Promise.all(
        targetManagers.map((pm) =>
          listGlobalPackages(pm, {
            additionalPath: prefs.additionalPath,
            registryUrl: prefs.registryUrl,
            checkLatest: true,
          }),
        ),
      );
      return lists.flat();
    },
    [installedManagers, managerFilter],
  );

  const { data: favorites, revalidate: revalidateFavs } = usePromise(getFavorites);
  const favNames = useMemo(() => new Set((favorites ?? []).map((f) => f.name)), [favorites]);

  const packages = useMemo(() => globals ?? [], [globals]);
  const outdatedGlobals = useMemo(() => packages.filter((p) => Boolean(p.bump)), [packages]);

  async function handleUpdateGlobal(pkg: GlobalPackage) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Updating ${pkg.name} globally...`,
      message: PACKAGE_MANAGER_META[pkg.packageManager].label,
    });

    const outcome = await executeUpdate({
      pm: pkg.packageManager,
      packages: [pkg.latestVersion ? `${pkg.name}@${pkg.latestVersion}` : pkg.name],
      isGlobal: true,
      latest: true,
      additionalPath: prefs.additionalPath,
    });

    await toast.hide();
    await notifyOperationResult({
      title: outcome.success ? `Updated ${pkg.name}` : `Failed to update ${pkg.name}`,
      message: outcome.success
        ? `${pkg.version} → ${pkg.latestVersion ?? "latest"} · ${formatDuration(outcome.durationMs)}`
        : outcome.errorMessage,
      success: outcome.success,
      durationMs: outcome.durationMs,
    });

    if (outcome.success) await revalidate();
  }

  async function handleUpdateAllOutdated() {
    if (outdatedGlobals.length === 0) return;

    const ok = await confirmAlert({
      title: `Update ${outdatedGlobals.length} outdated global package(s)?`,
      message: outdatedGlobals.map((p) => `${p.name} (${p.version} → ${p.latestVersion})`).join("\n"),
      primaryAction: { title: "Update All", style: Alert.ActionStyle.Default },
    });
    if (!ok) return;

    const grouped = new Map<PackageManagerName, GlobalPackage[]>();
    for (const pkg of outdatedGlobals) {
      const list = grouped.get(pkg.packageManager) ?? [];
      list.push(pkg);
      grouped.set(pkg.packageManager, list);
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Updating ${outdatedGlobals.length} global packages...`,
    });

    let failures = 0;
    let totalMs = 0;
    for (const [pm, list] of grouped.entries()) {
      const outcome = await executeUpdate({
        pm,
        packages: list.map((p) => `${p.name}@${p.latestVersion ?? "latest"}`),
        isGlobal: true,
        latest: true,
        additionalPath: prefs.additionalPath,
      });
      totalMs += outcome.durationMs;
      if (!outcome.success) failures += 1;
    }

    await toast.hide();
    await notifyOperationResult({
      title: failures === 0 ? `Updated ${outdatedGlobals.length} global packages` : `Updated with ${failures} error(s)`,
      message: formatDuration(totalMs),
      success: failures === 0,
      durationMs: totalMs,
    });

    await revalidate();
  }

  async function handleReinstallGlobal(pkg: GlobalPackage) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Reinstalling ${pkg.name}...`,
    });

    const outcome = await executeReinstall({
      pm: pkg.packageManager,
      packageName: pkg.name,
      isGlobal: true,
      additionalPath: prefs.additionalPath,
    });

    await toast.hide();
    await notifyOperationResult({
      title: outcome.success ? `Reinstalled ${pkg.name}` : `Reinstall failed`,
      message: outcome.success ? formatDuration(outcome.durationMs) : outcome.errorMessage,
      success: outcome.success,
      durationMs: outcome.durationMs,
    });

    if (outcome.success) await revalidate();
  }

  async function handleUninstallGlobal(pkg: GlobalPackage) {
    const ok = await confirmAlert({
      title: `Uninstall global package "${pkg.name}"?`,
      message: `Removes ${pkg.name} globally using ${PACKAGE_MANAGER_META[pkg.packageManager].label}.`,
      primaryAction: { title: "Uninstall", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Uninstalling ${pkg.name}...`,
    });

    const outcome = await executeUninstall({
      pm: pkg.packageManager,
      packageName: pkg.name,
      isGlobal: true,
      additionalPath: prefs.additionalPath,
    });

    await toast.hide();
    await notifyOperationResult({
      title: outcome.success ? `Uninstalled ${pkg.name}` : `Uninstall failed`,
      message: outcome.success ? formatDuration(outcome.durationMs) : outcome.errorMessage,
      success: outcome.success,
      durationMs: outcome.durationMs,
    });

    if (outcome.success) await revalidate();
  }

  async function handleToggleFav(pkg: GlobalPackage) {
    const res = await toggleFavorite({
      name: pkg.name,
      description: `Global ${pkg.packageManager} package`,
      version: pkg.latestVersion ?? pkg.version,
      links: { npm: `https://www.npmjs.com/package/${pkg.name}` },
    });
    await revalidateFavs();
    await showToast({
      style: Toast.Style.Success,
      title: res.isFavorite ? `Added ${pkg.name} to Favorites` : `Removed ${pkg.name} from Favorites`,
    });
  }

  const selectedManagerMissing =
    managerFilter !== "all" && !loadingManagers && !installedManagers.includes(managerFilter);

  return (
    <List
      isLoading={loadingManagers || loadingGlobals}
      searchBarPlaceholder="Search globally installed packages..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Package Manager"
          value={managerFilter}
          onChange={(v) => setManagerFilter(v as ManagerFilter)}
        >
          <List.Dropdown.Item title="All Installed Managers" value="all" />
          {(managersInfo ?? []).map((m) => (
            <List.Dropdown.Item
              key={m.name}
              value={m.name}
              title={
                m.installed
                  ? `${PACKAGE_MANAGER_META[m.name].label} (v${m.version ?? "?"})`
                  : `${PACKAGE_MANAGER_META[m.name].label} (Not Installed)`
              }
            />
          ))}
        </List.Dropdown>
      }
    >
      {selectedManagerMissing ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Orange }}
          title={`${PACKAGE_MANAGER_META[managerFilter].label} Is Not Installed`}
          description={`Packdeck could not find "${managerFilter}" in your PATH. Install it or configure Additional PATH Entries in preferences.`}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title={`Install ${PACKAGE_MANAGER_META[managerFilter].label}`}
                url={PACKAGE_MANAGER_META[managerFilter].installUrl}
              />
            </ActionPanel>
          }
        />
      ) : !loadingGlobals && packages.length === 0 ? (
        <List.EmptyView
          icon={Icon.Globe}
          title="No Global Packages Found"
          description="Install a CLI tool globally using Packdeck."
          actions={
            <ActionPanel>
              <Action.Push
                title="Install Global Package…"
                icon={Icon.Download}
                target={<InstallPackageForm defaultGlobal onSuccess={revalidate} />}
              />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section
          title="Global Packages"
          subtitle={`${packages.length} installed${outdatedGlobals.length > 0 ? ` · ${outdatedGlobals.length} outdated` : ""}`}
        >
          {packages.map((pkg) => {
            const pmMeta = PACKAGE_MANAGER_META[pkg.packageManager];
            const bumpMeta = pkg.bump ? BUMP_META[pkg.bump] : undefined;
            const isFav = favNames.has(pkg.name);

            return (
              <List.Item
                key={`${pkg.packageManager}-${pkg.name}`}
                icon={
                  bumpMeta
                    ? { source: bumpMeta.icon, tintColor: bumpMeta.color }
                    : { source: Icon.Globe, tintColor: pmMeta.color }
                }
                title={pkg.name}
                subtitle={bumpMeta && pkg.latestVersion ? `${pkg.version} → ${pkg.latestVersion}` : `v${pkg.version}`}
                accessories={[
                  ...(isFav ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Favorite" }] : []),
                  ...(bumpMeta ? [{ tag: { value: bumpMeta.label, color: bumpMeta.color } }] : []),
                  { tag: { value: pmMeta.label, color: pmMeta.color } },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Manage">
                      <Action.Push
                        title="View Package Details & README"
                        icon={Icon.Document}
                        target={<PackageDetailView packageName={pkg.name} onMutated={revalidate} />}
                      />
                      <Action
                        title={`Update ${pkg.name} to Latest`}
                        icon={Icon.ArrowUpCircle}
                        shortcut={{ modifiers: ["cmd"], key: "u" }}
                        onAction={() => handleUpdateGlobal(pkg)}
                      />
                      {outdatedGlobals.length > 0 && (
                        <Action
                          title={`Update All Outdated Globals (${outdatedGlobals.length})`}
                          icon={Icon.CheckList}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                          onAction={handleUpdateAllOutdated}
                        />
                      )}
                      <Action
                        title="Reinstall Global Package"
                        icon={Icon.ArrowClockwise}
                        onAction={() => handleReinstallGlobal(pkg)}
                      />
                      <Action
                        title="Uninstall Global Package"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["ctrl"], key: "x" }}
                        onAction={() => handleUninstallGlobal(pkg)}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Install & Favorites">
                      <Action.Push
                        title="Install New Global Package…"
                        icon={Icon.Download}
                        shortcut={Keyboard.Shortcut.Common.New}
                        target={<InstallPackageForm defaultGlobal onSuccess={revalidate} />}
                      />
                      <Action
                        title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                        icon={isFav ? Icon.StarDisabled : Icon.Star}
                        shortcut={{ modifiers: ["cmd"], key: "f" }}
                        onAction={() => handleToggleFav(pkg)}
                      />
                      <Action.CopyToClipboard
                        title="Copy Global Install Command"
                        content={buildInstallCommand(pkg.packageManager, pkg.name, { isGlobal: true }).display}
                      />
                      <Action.OpenInBrowser title="Open on npm" url={`https://www.npmjs.com/package/${pkg.name}`} />
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
