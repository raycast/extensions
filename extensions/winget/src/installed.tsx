import { Color, List } from "@raycast/api";
import { useState } from "react";
import { useWingetInstalled } from "./hooks/useWingetInstalled";
import { InstalledActionPanel } from "./components/actionPanels";

export default function InstalledCommand() {
  const [searchText, setSearchText] = useState("");
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const { data: packages, isLoading, revalidate } = useWingetInstalled();

  const pkgList = (packages ?? []).filter((pkg) => !removedIds.has(pkg.id));

  // Attach a stable index to each row before filtering so that React keys remain
  // unique even when winget returns multiple entries with identical (or truncated)
  // package IDs — e.g. different architectures of the same runtime, or IDs that
  // winget truncates with "…" in the table output.
  const indexed = pkgList.map((pkg, i) => ({ pkg, rowKey: i }));

  const filtered = searchText.trim()
    ? indexed.filter(({ pkg }) => {
        const q = searchText.toLowerCase();
        return pkg.name.toLowerCase().includes(q) || pkg.id.toLowerCase().includes(q);
      })
    : indexed;

  const upgradableCount = pkgList.filter((p) => p.available).length;

  function handleUninstalled(id: string) {
    setRemovedIds((prev) => new Set(prev).add(id));
  }

  // Clear optimistic removals once fresh data arrives (IDs are gone for real)
  function handleRefresh() {
    setRemovedIds(new Set());
    return revalidate();
  }

  const upgradesTitle = upgradableCount > 0 ? `Upgrades Available (${upgradableCount})` : "Upgrades Available";

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Filter installed packages…"
    >
      {filtered.length === 0 && !isLoading ? (
        <List.EmptyView title="No installed packages found" />
      ) : (
        <>
          {filtered.some(({ pkg }) => pkg.available) && (
            <List.Section title={upgradesTitle}>
              {filtered
                .filter(({ pkg }) => pkg.available)
                .map(({ pkg, rowKey }) => (
                  <List.Item
                    key={rowKey}
                    title={pkg.name}
                    subtitle={pkg.id || undefined}
                    accessories={[
                      { text: pkg.version, tooltip: "Installed" },
                      { tag: { value: `↑ ${pkg.available}`, color: Color.Yellow } },
                    ]}
                    actions={
                      <InstalledActionPanel
                        pkg={pkg}
                        onRefresh={handleRefresh}
                        onClearSearch={() => setSearchText("")}
                        onUninstalled={handleUninstalled}
                      />
                    }
                  />
                ))}
            </List.Section>
          )}
          <List.Section title="Installed">
            {filtered
              .filter(({ pkg }) => !pkg.available)
              .map(({ pkg, rowKey }) => (
                <List.Item
                  key={rowKey}
                  title={pkg.name}
                  subtitle={pkg.id || undefined}
                  accessories={[{ text: pkg.version }]}
                  actions={
                    <InstalledActionPanel
                      pkg={pkg}
                      onRefresh={handleRefresh}
                      onClearSearch={() => setSearchText("")}
                      onUninstalled={handleUninstalled}
                    />
                  }
                />
              ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
