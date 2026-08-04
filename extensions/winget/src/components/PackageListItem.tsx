/**
 * One package row, shared by all list views. Icon priority is
 * pinned > update available > installed > none, with per-view suppression:
 * Installed/Upgradable views don't show the implicit Installed check. Version
 * is shown only when the display name is ambiguous in the current list.
 */

import { Color, Icon, List } from "@raycast/api";

import { type WingetPackageDetails } from "../cli/types";
import { type OperationGate } from "../core/operations";
import { type DetailTarget } from "../hooks/useDetails";
import { type PackageInfo } from "../utils/packages";

import { type ViewKind } from "./PackageActions";
import { detailMarkdown, PackageDetailMeta } from "./PackageDetailMeta";

interface PackageListItemProps {
  pkg: PackageInfo;
  /** Unique List.Item id (source|id, version-disambiguated only when needed). */
  itemId: string;
  viewKind: ViewKind;
  gate: OperationGate;
  duplicateNames: Set<string>;
  isSelected: boolean;
  details: WingetPackageDetails | undefined;
  detailsLoading: boolean;
  actions: React.JSX.Element;
}

/**
 * Progress accessory only for the row actually being worked on — during bulk
 * operations that is the current package, not every visible row.
 */
function isOperatingOn(gate: OperationGate, pkg: PackageInfo): boolean {
  if (gate.status !== "busy" || !gate.opState?.target) {
    return false;
  }
  const current = gate.opState.target;
  return current.id === pkg.id && current.source === pkg.source;
}

function accessories(pkg: PackageInfo, viewKind: ViewKind, gate: OperationGate): List.Item.Accessory[] {
  if (isOperatingOn(gate, pkg)) {
    return [
      {
        icon: { source: Icon.CircleProgress, tintColor: Color.Blue },
        tooltip: "Operation in progress",
      },
    ];
  }
  if (pkg.isPinned) {
    return [
      {
        icon: { source: Icon.Pin, tintColor: Color.Orange },
        tooltip: "Pinned",
      },
    ];
  }
  if (pkg.hasUpdate) {
    return [
      {
        icon: { source: Icon.ArrowUp, tintColor: Color.Green },
        tooltip: `Update: ${pkg.availableVersion}`,
      },
    ];
  }
  if (pkg.isInstalled && viewKind === "search") {
    return [
      {
        icon: { source: Icon.CheckCircle, tintColor: Color.Blue },
        tooltip: "Installed",
      },
    ];
  }
  return [];
}

function PackageListItem({
  pkg,
  itemId,
  viewKind,
  gate,
  duplicateNames,
  isSelected,
  details,
  detailsLoading,
  actions,
}: PackageListItemProps) {
  return (
    <List.Item
      id={itemId}
      title={pkg.name}
      subtitle={duplicateNames.has(pkg.name) ? (pkg.installedVersion ?? pkg.version) : undefined}
      keywords={[pkg.id]}
      accessories={accessories(pkg, viewKind, gate)}
      detail={
        <List.Item.Detail
          isLoading={isSelected && detailsLoading}
          markdown={isSelected ? detailMarkdown(details, detailsLoading) : undefined}
          metadata={isSelected ? <PackageDetailMeta pkg={pkg} details={details} /> : undefined}
        />
      }
      actions={actions}
    />
  );
}

function toDetailTarget(pkg: PackageInfo): DetailTarget {
  return { id: pkg.id, source: pkg.source };
}

export { PackageListItem, toDetailTarget };
