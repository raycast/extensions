/** Show Installed: every WinGet-managed package, with Uninstall All (confirmed). */

import { Icon } from "@raycast/api";

import { PackageListView } from "./components/PackageListView";
import { applyPreferences } from "./core/prefs";
import { installedRows } from "./utils/packages";

/** Never bulk-uninstall the tools this extension (and the user's session) runs on. */
const UNINSTALL_ALL_EXCLUDED = new Set(["Raycast.Raycast", "Microsoft.AppInstaller"]);

export default function ShowInstalled() {
  applyPreferences();

  return (
    <PackageListView
      viewKind="installed"
      searchBarPlaceholder="Filter installed packages…"
      indexOptions={{ needsCatalog: false }}
      buildSections={(index, lookups, searchText) => {
        const rows = installedRows(index, lookups).filter(
          (row) =>
            !searchText ||
            row.name.toLowerCase().includes(searchText.toLowerCase()) ||
            row.id.toLowerCase().includes(searchText.toLowerCase()),
        );
        return [
          {
            id: "installed",
            title: "Installed",
            subtitle: `${rows.length}`,
            rows,
          },
        ];
      }}
      emptyState={(hasIndex) =>
        hasIndex
          ? {
              title: "No Installed Packages",
              description: "No WinGet-managed packages found",
              icon: Icon.Tray,
            }
          : {
              title: "No Package Index",
              description: "Press ⏎ to build the package index",
              icon: Icon.Tray,
            }
      }
      bulkTargets={(index, lookups) => ({
        uninstallAllTargets: installedRows(index, lookups)
          .filter((row) => !UNINSTALL_ALL_EXCLUDED.has(row.id))
          .map((row) => ({
            id: row.id,
            name: row.name,
            source: row.source,
            // Multi-version rows must each target their own version.
            version: row.hasSiblingVersions ? row.installedVersion : undefined,
          })),
      })}
    />
  );
}
