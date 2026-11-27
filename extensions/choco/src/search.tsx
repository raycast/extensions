import { Color, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { ChocoErrorView } from "./components/ChocoErrorView";
import { PackageActions } from "./components/PackageActions";
import { PackageDetail } from "./components/PackageDetail";
import { getChocoPreferences } from "./choco/preferences";
import { InstalledPackage, OutdatedPackage } from "./choco/types";
import {
  useChocoSearch,
  useInstalledPackages,
  useOutdatedPackages,
} from "./hooks/useChocoData";

type SearchFilter = "all" | "not-installed" | "installed";

export default function SearchPackagesCommand() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<SearchFilter>("all");
  const prefs = getChocoPreferences();

  const {
    data: packages = [],
    isLoading: isSearching,
    error: searchError,
    revalidate: revalidateSearch,
  } = useChocoSearch(searchText);

  const {
    data: installedList = [],
    error: installedError,
    revalidate: revalidateInstalled,
  } = useInstalledPackages();

  const { data: outdatedList = [], revalidate: revalidateOutdated } =
    useOutdatedPackages();

  const installedMap = useMemo(() => {
    const map = new Map<string, InstalledPackage>();
    for (const item of installedList) {
      map.set(item.id.toLowerCase(), item);
    }
    return map;
  }, [installedList]);

  const outdatedMap = useMemo(() => {
    const map = new Map<string, OutdatedPackage>();
    for (const item of outdatedList) {
      map.set(item.id.toLowerCase(), item);
    }
    return map;
  }, [outdatedList]);

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const isInstalled = installedMap.has(pkg.id.toLowerCase());
      if (filter === "installed") {
        return isInstalled;
      }
      if (filter === "not-installed") {
        return !isInstalled;
      }
      return true;
    });
  }, [packages, installedMap, filter]);

  function refreshAll() {
    revalidateSearch();
    revalidateInstalled();
    revalidateOutdated();
  }

  if (installedError && packages.length === 0) {
    return <ChocoErrorView error={installedError} onRetry={refreshAll} />;
  }

  if (searchError && packages.length === 0) {
    return <ChocoErrorView error={searchError} onRetry={refreshAll} />;
  }

  const sectionTitle = searchText.trim()
    ? "Search Results"
    : "Popular Packages";

  return (
    <List
      isLoading={isSearching}
      isShowingDetail
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Chocolatey packages (e.g. git, vscode, 7zip)..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Packages"
          value={filter}
          onChange={(val) => setFilter(val as SearchFilter)}
        >
          <List.Dropdown.Item title="All Packages" value="all" />
          <List.Dropdown.Item title="Not Installed" value="not-installed" />
          <List.Dropdown.Item title="Installed" value="installed" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={searchText.trim() ? "No Packages Found" : "Search Chocolatey"}
        description={
          searchText.trim()
            ? `No Chocolatey packages matched "${searchText}".`
            : "Type a package name to search the Chocolatey repository."
        }
      />
      <List.Section
        title={sectionTitle}
        subtitle={`${filteredPackages.length}`}
      >
        {filteredPackages.map((pkg) => {
          const key = pkg.id.toLowerCase();
          const installed = installedMap.get(key);
          const outdated = outdatedMap.get(key);

          const accessories: List.Item.Accessory[] = [];
          if (outdated) {
            accessories.push({ tag: { value: "Update", color: Color.Orange } });
          } else if (installed) {
            accessories.push({
              icon: { source: Icon.CheckCircle, tintColor: Color.Green },
              tooltip: "Installed",
            });
          }
          accessories.push({ text: pkg.version });

          return (
            <List.Item
              key={`${pkg.id}-${pkg.version}`}
              id={pkg.id}
              title={pkg.title || pkg.id}
              subtitle={
                pkg.title && pkg.title.toLowerCase() !== pkg.id.toLowerCase()
                  ? pkg.id
                  : undefined
              }
              icon={
                prefs.showPackageIcons && pkg.iconUrl
                  ? { source: pkg.iconUrl, fallback: Icon.Box }
                  : Icon.Box
              }
              accessories={accessories}
              detail={
                <PackageDetail
                  id={pkg.id}
                  pkg={pkg}
                  installed={installed}
                  outdated={outdated}
                />
              }
              actions={
                <PackageActions
                  id={pkg.id}
                  pkg={pkg}
                  installed={installed}
                  outdated={outdated}
                  onRefresh={refreshAll}
                />
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
