import { Color, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { ChocoErrorView } from "./components/ChocoErrorView";
import { PackageActions } from "./components/PackageActions";
import { PackageDetail } from "./components/PackageDetail";
import { getChocoPreferences } from "./choco/preferences";
import { InstalledPackage, OutdatedPackage } from "./choco/types";
import {
  useInstalledPackages,
  useOutdatedPackages,
  usePackageMetadataMap,
} from "./hooks/useChocoData";

type InstalledFilter = "all" | "pinned" | "outdated";

export default function InstalledPackagesCommand() {
  const [filter, setFilter] = useState<InstalledFilter>("all");
  const prefs = getChocoPreferences();

  const {
    data: installedList = [],
    isLoading: isLoadingInstalled,
    error,
    revalidate: revalidateInstalled,
  } = useInstalledPackages();

  const {
    data: outdatedList = [],
    isLoading: isLoadingOutdated,
    revalidate: revalidateOutdated,
  } = useOutdatedPackages();

  const packageIds = useMemo(
    () => installedList.map((item) => item.id),
    [installedList],
  );
  const { data: metadataMap } = usePackageMetadataMap(packageIds);

  const outdatedMap = useMemo(() => {
    const map = new Map<string, OutdatedPackage>();
    for (const item of outdatedList) {
      map.set(item.id.toLowerCase(), item);
    }
    return map;
  }, [outdatedList]);

  const { pinnedItems, regularItems } = useMemo(() => {
    const filtered = installedList.filter((item) => {
      if (filter === "pinned") {
        return item.pinned;
      }
      if (filter === "outdated") {
        return outdatedMap.has(item.id.toLowerCase());
      }
      return true;
    });

    const pinned: InstalledPackage[] = [];
    const regular: InstalledPackage[] = [];
    for (const item of filtered) {
      if (item.pinned) {
        pinned.push(item);
      } else {
        regular.push(item);
      }
    }
    return { pinnedItems: pinned, regularItems: regular };
  }, [installedList, filter, outdatedMap]);

  function refreshAll() {
    revalidateInstalled();
    revalidateOutdated();
  }

  if (error) {
    return <ChocoErrorView error={error} onRetry={refreshAll} />;
  }

  function renderItem(item: InstalledPackage) {
    const key = item.id.toLowerCase();
    const pkg = metadataMap?.get(key);
    const outdated = outdatedMap.get(key);

    const accessories: List.Item.Accessory[] = [];
    if (item.pinned) {
      accessories.push({
        icon: { source: Icon.Pin, tintColor: Color.Yellow },
        tooltip: "Pinned",
      });
    }
    if (outdated) {
      accessories.push({
        tag: { value: `→ ${outdated.availableVersion}`, color: Color.Orange },
        tooltip: "Update available",
      });
    }
    accessories.push({ text: item.version });

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
            installed={item}
            outdated={outdated}
          />
        }
        actions={
          <PackageActions
            id={item.id}
            pkg={pkg}
            installed={item}
            outdated={outdated}
            onRefresh={refreshAll}
          />
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoadingInstalled || isLoadingOutdated}
      isShowingDetail
      searchBarPlaceholder="Filter installed packages..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Installed"
          value={filter}
          onChange={(val) => setFilter(val as InstalledFilter)}
        >
          <List.Dropdown.Item title="All Installed" value="all" />
          <List.Dropdown.Item title="Pinned" value="pinned" />
          <List.Dropdown.Item title="Outdated" value="outdated" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Box}
        title="No Packages Found"
        description="No installed Chocolatey packages match the current filter."
      />
      {pinnedItems.length > 0 && (
        <List.Section title="Pinned" subtitle={`${pinnedItems.length}`}>
          {pinnedItems.map(renderItem)}
        </List.Section>
      )}
      <List.Section title="Installed" subtitle={`${regularItems.length}`}>
        {regularItems.map(renderItem)}
      </List.Section>
    </List>
  );
}
