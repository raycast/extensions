/**
 * Search Packages: local ranked search over the cached catalog, sectioned into
 * Updates Available / Installed / Available, capped at 200 rendered rows with
 * per-section totals computed before the cap. The catalog cannot include Microsoft Store
 * packages (winget's empty-query enumeration only covers the winget source) —
 * the empty state says so.
 */

import { Icon } from "@raycast/api";

import { PackageListView, type ListSection } from "./components/PackageListView";
import { applyPreferences } from "./core/prefs";
import { searchRows, type PackageInfo } from "./utils/packages";

const MAX_ROWS = 200;

export default function SearchPackages() {
  applyPreferences();

  return (
    <PackageListView
      viewKind="search"
      searchBarPlaceholder="Search packages…"
      buildSections={(index, lookups, searchText) => {
        // Categorize the full result set first so per-section totals are
        // computed before the cap, then cap what is rendered.
        const all = searchRows(index, lookups, searchText);
        const updates: PackageInfo[] = [];
        const installed: PackageInfo[] = [];
        const available: PackageInfo[] = [];
        for (const row of all) {
          if (row.hasUpdate) {
            updates.push(row);
          } else if (row.isInstalled) {
            installed.push(row);
          } else {
            available.push(row);
          }
        }

        const sections: ListSection[] = [];
        let budget = MAX_ROWS;
        for (const [id, title, rows] of [
          ["updates", "Updates Available", updates],
          ["installed", "Installed", installed],
          ["available", "Available", available],
        ] as const) {
          const shown = rows.slice(0, Math.max(0, budget));
          budget -= shown.length;
          sections.push({
            id,
            title,
            subtitle:
              shown.length < rows.length
                ? `showing ${shown.length} of ${rows.length}, refine your search`
                : `${rows.length}`,
            rows: shown,
          });
        }
        return sections;
      }}
      emptyState={(hasIndex, searchText) =>
        !hasIndex
          ? {
              title: "No Package Index",
              description: "The package index builds on first use",
              icon: Icon.MagnifyingGlass,
            }
          : {
              title: "No Packages Found",
              description: searchText
                ? "Try a different search term. Microsoft Store apps can't be searched here, manage them in Show Installed."
                : "The index appears to be empty. Try Update Package Index",
              icon: Icon.MagnifyingGlass,
            }
      }
      pullOperatingRow
    />
  );
}
