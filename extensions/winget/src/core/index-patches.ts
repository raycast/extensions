/**
 * Optimistic index patches — pure transforms applied to the mutable slices the
 * moment an operation succeeds, so open views update within one tick without
 * any winget call. The authoritative post-operation refresh corrects any
 * drift afterwards.
 */

import { type WingetOperationResult } from "../cli/types";

import { type MutableSlices } from "./index-store";
import { type OperationKind, type PackageTarget } from "./operations";

function sameKey(a: { id: string; source: string }, b: { id: string; source: string }): boolean {
  return a.id === b.id && a.source === b.source;
}

/**
 * Returns the patched slices, or null when there is nothing to patch (no-ops,
 * failures other than completed-with-reboot, kinds without per-package
 * effects like import/export/download/repair).
 */
function applyOperationPatch(
  kind: OperationKind,
  target: PackageTarget | undefined,
  version: string | undefined,
  result: WingetOperationResult,
  slices: MutableSlices,
): MutableSlices | null {
  if (!result.success || result.noop || !target) {
    return null;
  }

  switch (kind) {
    case "install": {
      const upgradeRow = slices.upgradable.find((u) => sameKey(u, target));
      const newVersion = upgradeRow?.available ?? version ?? "Unknown";
      const installed = slices.installed.some((i) => sameKey(i, target))
        ? slices.installed.map((i) => (sameKey(i, target) ? { ...i, version: newVersion, available: undefined } : i))
        : [
            ...slices.installed,
            {
              id: target.id,
              name: target.name,
              version: newVersion,
              source: target.source,
            },
          ];
      return {
        installed,
        upgradable: slices.upgradable.filter((u) => !sameKey(u, target)),
        pinned: slices.pinned,
      };
    }
    case "install-version": {
      const newVersion = version ?? "Unknown";
      const installed = slices.installed.some((i) => sameKey(i, target))
        ? slices.installed.map((i) => (sameKey(i, target) ? { ...i, version: newVersion, available: undefined } : i))
        : [
            ...slices.installed,
            {
              id: target.id,
              name: target.name,
              version: newVersion,
              source: target.source,
            },
          ];
      // Version installs auto-add a blocking pin.
      const pinned = slices.pinned.some((p) => sameKey(p, target))
        ? slices.pinned
        : [...slices.pinned, { id: target.id, version: undefined, source: target.source }];
      return {
        installed,
        upgradable: slices.upgradable.filter((u) => !sameKey(u, target)),
        pinned,
      };
    }
    case "upgrade": {
      const upgradeRow = slices.upgradable.find((u) => sameKey(u, target));
      return {
        installed: slices.installed.map((i) =>
          sameKey(i, target)
            ? {
                ...i,
                version: upgradeRow?.available ?? i.version,
                available: undefined,
              }
            : i,
        ),
        upgradable: slices.upgradable.filter((u) => !sameKey(u, target)),
        pinned: slices.pinned,
      };
    }
    case "uninstall": {
      // A version-targeted uninstall (multi-version package) removes only the
      // matching row; pin and upgradable entries are keyed by (source, id) and
      // leave only when no installed version remains.
      const installed = slices.installed.filter(
        (i) => !sameKey(i, target) || (version !== undefined && i.version !== version),
      );
      const stillInstalled = installed.some((i) => sameKey(i, target));
      return {
        installed,
        upgradable: stillInstalled ? slices.upgradable : slices.upgradable.filter((u) => !sameKey(u, target)),
        pinned: stillInstalled ? slices.pinned : slices.pinned.filter((p) => !sameKey(p, target)),
      };
    }
    case "pin": {
      if (slices.pinned.some((p) => sameKey(p, target))) {
        return null;
      }
      return {
        installed: slices.installed,
        upgradable: slices.upgradable,
        pinned: [...slices.pinned, { id: target.id, version: undefined, source: target.source }],
      };
    }
    case "unpin": {
      return {
        installed: slices.installed,
        upgradable: slices.upgradable,
        pinned: slices.pinned.filter((p) => !sameKey(p, target)),
      };
    }
    default:
      // repair/download/export: no slice change; import/bulk: handled per package.
      return null;
  }
}

export { applyOperationPatch };
