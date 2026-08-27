/**
 * Upgrade command: upgrades all outdated packages.
 *
 * Shows the outdated formulae & casks, with progress reported via the toast/HUD.
 * The icon of each item reflects its upgrade status.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import {
  actionsLogger,
  brewUpgradeCommand,
  brewUpgradeOutdated,
  ensureError,
  formatCount,
  type OutdatedCask,
  type OutdatedFormula,
  type OutdatedResults,
  preferences,
  showActionToast,
  showBrewFailureToast,
  upgradeKey,
  type ActionToastHandle,
  type UpgradePackageStatus,
} from "./utils";
import { useBrewOutdated } from "./hooks/useBrewOutdated";
import { InstallableFilterDropdown, InstallableFilterType } from "./components/filter";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { OutdatedList, PENDING_ICON } from "./components/outdatedList";

interface PackageState {
  status: UpgradePackageStatus;
  message?: string;
}

/**
 * The list item icon, indicating the upgrade status of a package.
 */
function statusIcon(state?: PackageState): React.ComponentProps<typeof List.Item>["icon"] {
  if (!state) return { value: PENDING_ICON, tooltip: "Pending" };

  switch (state.status) {
    case "upgrading":
      return { value: { source: Icon.ArrowDownCircle, tintColor: Color.Blue }, tooltip: "Upgrading…" };
    case "upgraded":
      return { value: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "Upgraded" };
    case "failed":
      return { value: { source: Icon.XMarkCircle, tintColor: Color.Red }, tooltip: state.message ?? "Upgrade failed" };
    case "skipped":
      return {
        value: { source: Icon.MinusCircle, tintColor: Color.SecondaryText },
        tooltip: state.message ?? "Skipped",
      };
  }
}

function UpgradingActionPanel(props: { outdated: OutdatedCask | OutdatedFormula; onCancel: () => void }) {
  return (
    <ActionPanel>
      <Action
        title="Cancel Upgrade"
        icon={Icon.XMarkCircle}
        style={Action.Style.Destructive}
        onAction={props.onCancel}
      />
      <Action.CopyToClipboard
        title="Copy Upgrade Command"
        content={brewUpgradeCommand(props.outdated)}
        shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
      />
    </ActionPanel>
  );
}

function UpgradeContent() {
  const [filter, setFilter] = useState(InstallableFilterType.all);
  // The upgrade runs its own brew update, so skip the hook's background refresh:
  // brew does not support concurrent processes.
  const { isLoading, data, revalidate } = useBrewOutdated({ backgroundRefresh: false });
  // Fresh results, fetched by the upgrade after running brew update
  const [outdated, setOutdated] = useState<OutdatedResults | undefined>();
  const [states, setStates] = useState<Map<string, PackageState>>(new Map());
  const [isUpgrading, setIsUpgrading] = useState(true);
  const toastRef = useRef<ActionToastHandle | undefined>(undefined);
  const hasStartedRef = useRef(false);

  const setPackageState = useCallback((key: string, state: PackageState) => {
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

  const runUpgrade = useCallback(async () => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

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
                setPackageState(upgradeKey(event.package), { status: event.status, message: event.message });
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
      setIsUpgrading(false);
    }
  }, [setPackageState]);

  // Start once the (cached) outdated packages are listed, so the upgrade
  // doesn't run concurrently with the initial brew outdated fetch.
  useEffect(() => {
    if (!isLoading) {
      runUpgrade();
    }
  }, [isLoading, runUpgrade]);

  const handleCancel = useCallback(() => {
    toastRef.current?.abort?.abort();
  }, []);

  const handleAction = useCallback(() => {
    // Show the refreshed results, rather than those fetched by the upgrade
    setOutdated(undefined);
    setStates(new Map());
    revalidate();
  }, [revalidate]);

  return (
    <OutdatedList
      outdated={outdated ?? data}
      isLoading={isLoading || isUpgrading}
      filterType={filter}
      navigationTitle="Upgrade"
      searchBarPlaceholder={isUpgrading ? "Upgrading…" : undefined}
      searchBarAccessory={<InstallableFilterDropdown onSelect={setFilter} />}
      icon={(item, isCask) => statusIcon(states.get(upgradeKey({ name: item.name, isCask })))}
      actions={isUpgrading ? (item) => <UpgradingActionPanel outdated={item} onCancel={handleCancel} /> : undefined}
      onAction={handleAction}
    />
  );
}

export default function Main() {
  return (
    <ErrorBoundary>
      <UpgradeContent />
    </ErrorBoundary>
  );
}
