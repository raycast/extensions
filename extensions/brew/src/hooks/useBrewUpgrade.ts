/**
 * Hook for upgrading all outdated packages.
 *
 * Progress is reported via the toast/HUD. The per-package status is exposed so
 * that a list can show it, e.g. as the icon of each item.
 */

import { useCallback, useRef, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import {
  actionsLogger,
  brewUpgradeOutdated,
  ensureError,
  formatCount,
  preferences,
  showActionToast,
  showBrewFailureToast,
  upgradeKey,
  type ActionToastHandle,
  type OutdatedResults,
  type UpgradePackage,
  type UpgradePackageStatus,
} from "../utils";

/** Upgrade status of a package. */
export interface PackageState {
  status: UpgradePackageStatus;
  message?: string;
}

export interface BrewUpgrade {
  /** Upgrade status of each package, keyed by `upgradeKey` */
  states: Map<string, PackageState>;
  /** Outdated packages, as fetched when the upgrade started */
  outdated?: OutdatedResults;
  isUpgrading: boolean;
  /** Upgrade all outdated packages. Does nothing if an upgrade is already running. */
  upgradeAll: () => Promise<void>;
  /** Set the status of a single package, e.g. when upgraded individually */
  setPackageState: (pkg: UpgradePackage, state: PackageState) => void;
  /** Cancel the running upgrade */
  cancel: () => void;
  /** Clear the upgrade status of all packages */
  reset: () => void;
}

export function useBrewUpgrade(): BrewUpgrade {
  const [states, setStates] = useState<Map<string, PackageState>>(new Map());
  const [outdated, setOutdated] = useState<OutdatedResults | undefined>();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const toastRef = useRef<ActionToastHandle | undefined>(undefined);
  const isUpgradingRef = useRef(false);

  const setState = useCallback((key: string, state: PackageState) => {
    setStates((previous) => {
      const existing = previous.get(key);
      if (existing?.status === state.status && existing?.message === state.message) {
        return previous;
      }
      const next = new Map(previous);
      next.set(key, state);
      return next;
    });
  }, []);

  const setPackageState = useCallback(
    (pkg: UpgradePackage, state: PackageState) => setState(upgradeKey(pkg), state),
    [setState],
  );

  const upgradeAll = useCallback(async () => {
    // Homebrew does not support concurrent upgrades
    if (isUpgradingRef.current) {
      actionsLogger.log("Upgrade already running, skipping duplicate call");
      return;
    }
    isUpgradingRef.current = true;
    setIsUpgrading(true);

    actionsLogger.log("Starting upgrade process");

    const toast = showActionToast({ title: "Upgrading", message: "Updating Homebrew…", cancelable: true });
    toastRef.current = toast;

    // Progress is reported via the toast: only the package status is reflected in the list
    let total = 0;
    let finished = 0;

    try {
      const summary = await brewUpgradeOutdated({
        greedy: preferences.greedyUpgrades,
        cancel: toast.abort?.signal,
        onEvent: (event) => {
          switch (event.type) {
            case "update":
              toast.updateTitle("Upgrading");
              toast.updateMessage("Updating Homebrew…");
              break;
            case "check":
              toast.updateMessage("Checking for outdated packages…");
              break;
            case "start":
              total = event.packages.length;
              setOutdated(event.outdated);
              break;
            case "prefetch":
              toast.updateTitle(`Downloading ${formatCount(total, "package")}`);
              toast.updateMessage(event.progress?.message ?? "");
              break;
            case "package":
              if (event.status === "upgrading" && event.progress) {
                // Download/install progress is shown in the toast only, to avoid
                // re-rendering the list for every line of brew output
                toast.updateMessage(event.progress.message);
              } else {
                if (event.status === "upgrading") {
                  toast.updateTitle(`Upgrading ${event.package.name} (${finished + 1}/${total})`);
                  toast.updateMessage("");
                } else if (event.status !== "skipped") {
                  finished += 1;
                }
                setState(upgradeKey(event.package), { status: event.status, message: event.message });
              }
              break;
          }
        },
      });

      if (summary.cancelled) {
        toast.hide();
        await showToast({
          style: Toast.Style.Failure,
          title: "Upgrade Cancelled",
          message: `${formatCount(summary.upgraded.length, "package")} upgraded`,
        });
      } else if (summary.failed.length > 0) {
        // Keep the window open so the failed packages remain visible
        toast.hide();
        await showToast({
          style: Toast.Style.Failure,
          title: `Failed to upgrade ${formatCount(summary.failed.length, "package")}`,
          message: summary.failed.map((pkg) => pkg.name).join(", "),
        });
      } else if (summary.upgraded.length === 0) {
        await toast.showSuccessHUD("Nothing to upgrade");
      } else {
        await toast.showSuccessHUD(`Upgraded ${formatCount(summary.upgraded.length, "package")}`);
      }
    } catch (err) {
      const error = ensureError(err);
      toast.hide();

      if (error.name === "AbortError") {
        actionsLogger.log("Upgrade cancelled by user");
        await showToast({ style: Toast.Style.Failure, title: "Upgrade Cancelled" });
      } else {
        actionsLogger.error("Upgrade failed", { name: error.name, message: error.message });
        await showBrewFailureToast("Upgrade failed", error);
      }
    } finally {
      isUpgradingRef.current = false;
      setIsUpgrading(false);
    }
  }, [setState]);

  const cancel = useCallback(() => {
    toastRef.current?.abort?.abort();
  }, []);

  const reset = useCallback(() => {
    setStates(new Map());
    setOutdated(undefined);
  }, []);

  return { states, outdated, isUpgrading, upgradeAll, setPackageState, cancel, reset };
}
