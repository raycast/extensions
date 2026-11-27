import { Action, Alert, Color, confirmAlert, Icon, List } from "@raycast/api";
import { useMemo } from "react";
import { upgradeAllPackages } from "./choco/cli";
import { getChocoPreferences } from "./choco/preferences";
import { InstalledPackage, OutdatedPackage } from "./choco/types";
import { ChocoErrorView } from "./components/ChocoErrorView";
import { PackageActions, runPackageTask } from "./components/PackageActions";
import { PackageDetail } from "./components/PackageDetail";
import {
  useInstalledPackages,
  useOutdatedPackages,
  usePackageMetadataMap,
} from "./hooks/useChocoData";

export default function UpgradesCommand() {
  const prefs = getChocoPreferences();

  const {
    data: outdatedList = [],
    isLoading: isLoadingOutdated,
    error,
    revalidate: revalidateOutdated,
  } = useOutdatedPackages();

  const { data: installedList = [], revalidate: revalidateInstalled } =
    useInstalledPackages();

  const packageIds = useMemo(
    () => outdatedList.map((item) => item.id),
    [outdatedList],
  );
  const { data: metadataMap } = usePackageMetadataMap(packageIds);

  const installedMap = useMemo(() => {
    const map = new Map<string, InstalledPackage>();
    for (const item of installedList) {
      map.set(item.id.toLowerCase(), item);
    }
    return map;
  }, [installedList]);

  const { upgradableItems, pinnedItems } = useMemo(() => {
    const upgradable: OutdatedPackage[] = [];
    const pinned: OutdatedPackage[] = [];
    for (const item of outdatedList) {
      if (item.pinned) {
        pinned.push(item);
      } else {
        upgradable.push(item);
      }
    }
    return { upgradableItems: upgradable, pinnedItems: pinned };
  }, [outdatedList]);

  function refreshAll() {
    revalidateOutdated();
    revalidateInstalled();
  }

  async function handleUpgradeAll() {
    if (upgradableItems.length === 0) {
      return;
    }
    const confirmed = await confirmAlert({
      title: `Upgrade ${upgradableItems.length} package${upgradableItems.length === 1 ? "" : "s"}?`,
      message: "This will run `choco upgrade all` for all non-pinned packages.",
      primaryAction: {
        title: "Upgrade All",
        style: Alert.ActionStyle.Default,
      },
    });
    if (!confirmed) {
      return;
    }

    const ok = await runPackageTask({
      loadingTitle: `Upgrading ${upgradableItems.length} packages...`,
      successTitle: "Upgraded all packages",
      errorTitle: "Failed to upgrade all packages",
      task: () => upgradeAllPackages(),
    });
    if (ok) {
      refreshAll();
    }
  }

  if (error) {
    return <ChocoErrorView error={error} onRetry={refreshAll} />;
  }

  function renderOutdatedItem(item: OutdatedPackage) {
    const key = item.id.toLowerCase();
    const pkg = metadataMap?.get(key);
    const installed: InstalledPackage = installedMap.get(key) ?? {
      id: item.id,
      version: item.currentVersion,
      pinned: item.pinned,
    };

    const accessories: List.Item.Accessory[] = [];
    if (item.pinned) {
      accessories.push({ tag: { value: "Pinned", color: Color.Yellow } });
    }
    accessories.push({
      text: `${item.currentVersion} → ${item.availableVersion}`,
    });

    return (
      <List.Item
        key={item.id}
        id={item.id}
        title={pkg?.title || item.id}
        subtitle={
          pkg?.title && pkg.title.toLowerCase() !== item.id.toLowerCase()
            ? item.id
            : undefined
        }
        icon={
          prefs.showPackageIcons && pkg?.iconUrl
            ? { source: pkg.iconUrl, fallback: Icon.Box }
            : Icon.Box
        }
        accessories={accessories}
        detail={
          <PackageDetail
            id={item.id}
            pkg={pkg}
            installed={installed}
            outdated={item}
          />
        }
        actions={
          <PackageActions
            id={item.id}
            pkg={pkg}
            installed={installed}
            outdated={item}
            onRefresh={refreshAll}
            extraTopActions={
              upgradableItems.length > 1 ? (
                <Action
                  title={`Upgrade All (${upgradableItems.length})`}
                  icon={Icon.ArrowUpCircleFilled}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "u" }}
                  onAction={handleUpgradeAll}
                />
              ) : undefined
            }
          />
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoadingOutdated}
      isShowingDetail
      searchBarPlaceholder="Filter outdated packages..."
    >
      <List.EmptyView
        icon={Icon.CheckCircle}
        title="All Packages Up to Date"
        description="No outdated Chocolatey packages were found."
      />
      {upgradableItems.length > 0 && (
        <List.Section
          title="Available Upgrades"
          subtitle={`${upgradableItems.length}`}
        >
          {upgradableItems.map(renderOutdatedItem)}
        </List.Section>
      )}
      {pinnedItems.length > 0 && (
        <List.Section
          title="Pinned (Skipped)"
          subtitle={`${pinnedItems.length}`}
        >
          {pinnedItems.map(renderOutdatedItem)}
        </List.Section>
      )}
    </List>
  );
}
