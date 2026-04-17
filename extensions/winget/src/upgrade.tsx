import { Color, List } from "@raycast/api";
import { useWingetUpgrade } from "./hooks/useWingetUpgrade";
import { UpgradeActionPanel } from "./components/actionPanels";

export default function UpgradeCommand() {
  const { data: packages, isLoading, revalidate } = useWingetUpgrade();
  const pkgList = packages ?? [];

  const sectionTitle =
    !isLoading && pkgList.length > 0
      ? `${pkgList.length} upgrade${pkgList.length === 1 ? "" : "s"} available`
      : "Outdated Packages";

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter outdated packages…">
      {pkgList.length === 0 && !isLoading ? (
        <List.EmptyView title="All packages are up to date" description="No upgrades available" />
      ) : (
        <List.Section title={sectionTitle}>
          {pkgList.map((pkg) => (
            <List.Item
              key={pkg.id}
              title={pkg.name}
              subtitle={pkg.id}
              accessories={[
                { text: pkg.version, tooltip: "Current version" },
                { tag: { value: `→ ${pkg.available}`, color: Color.Yellow } },
              ]}
              actions={<UpgradeActionPanel pkg={pkg} totalOutdated={pkgList.length} onRefresh={revalidate} />}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
