import { Color, List } from "@raycast/api";
import { useState } from "react";
import { useWingetSearch } from "./hooks/useWingetSearch";
import { useWingetInstalled } from "./hooks/useWingetInstalled";
import { SearchActionPanel } from "./components/actionPanels";

export default function SearchCommand() {
  const [searchText, setSearchText] = useState("");
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  const { data: packages, isLoading: searchLoading, revalidate: revalidateSearch } = useWingetSearch(searchText);

  const { data: installed, revalidate: revalidateInstalled } = useWingetInstalled();

  const installedIds = new Set(
    (installed ?? []).filter((p) => p.id.length > 0 && !removedIds.has(p.id)).map((p) => p.id.toLowerCase()),
  );

  function handleRefresh() {
    setRemovedIds(new Set());
    revalidateSearch();
    revalidateInstalled();
  }

  function handleUninstalled(id: string) {
    setRemovedIds((prev) => new Set(prev).add(id));
  }

  const pkgList = packages ?? [];

  return (
    <List
      isLoading={searchLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search winget packages…"
      throttle
    >
      {pkgList.length === 0 && !searchLoading && searchText.trim().length > 0 ? (
        <List.EmptyView title="No packages found" description={`No results for "${searchText}"`} />
      ) : pkgList.length === 0 && searchText.trim().length === 0 ? (
        <List.EmptyView
          title="Search for a package"
          description="Type a package name to search the winget repository"
        />
      ) : (
        pkgList.map((pkg) => {
          const isInstalled = installedIds.has(pkg.id.toLowerCase());
          return (
            <List.Item
              key={pkg.id}
              title={pkg.name}
              subtitle={pkg.id}
              accessories={[isInstalled ? { tag: { value: "Installed", color: Color.Green } } : { text: pkg.version }]}
              actions={
                <SearchActionPanel
                  pkg={pkg}
                  isInstalled={isInstalled}
                  onRefresh={handleRefresh}
                  onClearSearch={() => setSearchText("")}
                  onUninstalled={handleUninstalled}
                />
              }
            />
          );
        })
      )}
    </List>
  );
}
