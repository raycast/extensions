import { Color, getPreferenceValues, List } from "@raycast/api";
import { useState } from "react";
import { useWingetInstalled } from "./hooks/useWingetInstalled";
import { useWingetUpgrade } from "./hooks/useWingetUpgrade";
import { InstalledActionPanel } from "./components/actionPanels";

export default function InstalledCommand() {
  const [searchText, setSearchText] = useState("");
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const { data: packages, isLoading: installedLoading, revalidate: revalidateInstalled } = useWingetInstalled();
  const { data: upgrades, isLoading: upgradeLoading, revalidate: revalidateUpgrades } = useWingetUpgrade();

  // Build a lookup from package ID → available version using the authoritative
  // winget upgrade output so both Installed and Upgrade views show the same count.
  const upgradeMap = new Map((upgrades ?? []).map((p) => [p.id.toLowerCase(), p.available]));

  const isLoading = installedLoading || upgradeLoading;

  const { hideUnmanagedPackages } = getPreferenceValues<Preferences>();
  const seen = new Set<string>();
  const pkgList = (packages ?? [])
    .filter((pkg) => !removedIds.has(pkg.id))
    .filter((pkg) => !hideUnmanagedPackages || !!pkg.source)
    .map((pkg) => ({ ...pkg, available: upgradeMap.get(pkg.id.toLowerCase()) }))
    .filter((pkg) => {
      // Deduplicate by ID (falling back to name) — winget list can return multiple
      // rows for the same package ID (e.g. different architectures of the same app).
      // winget upgrade only tracks one entry per ID, so showing duplicates is misleading.
      const key = pkg.id.toLowerCase() || pkg.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

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
    revalidateInstalled();
    return revalidateUpgrades();
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
                      ...(pkg.source?.toLowerCase() === "msstore"
                        ? [{ tag: { value: "Microsoft Store", color: Color.Blue } }]
                        : !pkg.source
                          ? [{ tag: { value: "Unknown Source", color: Color.SecondaryText } }]
                          : []),
                      ...(pkg.version && pkg.version.toLowerCase() !== "unknown"
                        ? [{ text: pkg.version, tooltip: "Current version" }]
                        : []),
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
          {filtered.some(({ pkg }) => !pkg.available) && (
            <List.Section title="Installed">
              {filtered
                .filter(({ pkg }) => !pkg.available)
                .map(({ pkg, rowKey }) => (
                  <List.Item
                    key={rowKey}
                    title={pkg.name}
                    subtitle={pkg.id || undefined}
                    accessories={[
                      ...(pkg.source?.toLowerCase() === "msstore"
                        ? [{ tag: { value: "Microsoft Store", color: Color.Blue } }]
                        : !pkg.source
                          ? [{ tag: { value: "Unknown Source", color: Color.SecondaryText } }]
                          : []),
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
        </>
      )}
    </List>
  );
}
