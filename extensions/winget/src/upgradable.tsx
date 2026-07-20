/**
 * Show Upgradable: packages with available updates, including the
 * "require explicit targeting" rows winget hides behind a second table (our
 * upgrades always target --exact --id, which satisfies the requirement).
 * Pinned packages stay listed: their primary action is Unpin.
 */

import { Icon } from "@raycast/api";

import { PackageListView } from "./components/PackageListView";
import { applyPreferences } from "./core/prefs";
import { upgradableRows } from "./utils/packages";

export default function ShowUpgradable() {
  applyPreferences();

  return (
    <PackageListView
      viewKind="upgradable"
      searchBarPlaceholder="Filter upgradable packages…"
      indexOptions={{ needsCatalog: false }}
      buildSections={(index, lookups, searchText) => {
        const rows = upgradableRows(index, lookups).filter(
          (row) =>
            !searchText ||
            row.name.toLowerCase().includes(searchText.toLowerCase()) ||
            row.id.toLowerCase().includes(searchText.toLowerCase()),
        );
        return [
          {
            id: "upgradable",
            title: "Updates Available",
            subtitle: `${rows.length}`,
            rows,
          },
        ];
      }}
      emptyState={(hasIndex) =>
        hasIndex
          ? {
              title: "All Up to Date",
              description: "No updates available",
              icon: Icon.CheckCircle,
            }
          : {
              title: "No Package Index",
              description: "Press ⏎ to build the package index",
              icon: Icon.CheckCircle,
            }
      }
      bulkTargets={(index, lookups) => ({
        // Always from the full index slice — never the filtered/rendered rows.
        upgradeAllTargets: upgradableRows(index, lookups)
          .filter((row) => !row.isPinned)
          .map((row) => ({ id: row.id, name: row.name, source: row.source })),
      })}
    />
  );
}
