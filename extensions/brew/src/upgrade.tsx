/**
 * Upgrade command: upgrades all outdated packages.
 *
 * Shows the outdated formulae & casks, with progress reported via the toast/HUD.
 * The icon of each item reflects its upgrade status.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { upgradeKey } from "./utils";
import { useBrewOutdated } from "./hooks/useBrewOutdated";
import { useBrewUpgrade } from "./hooks/useBrewUpgrade";
import { InstallableFilterDropdown, InstallableFilterType } from "./components/filter";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { UpgradingActionPanel } from "./components/actionPanels";
import { OutdatedList, statusIcon } from "./components/outdatedList";

function UpgradeContent() {
  const [filter, setFilter] = useState(InstallableFilterType.all);
  // The upgrade runs its own brew update, so skip the hook's background refresh:
  // brew does not support concurrent processes.
  const { isLoading, data, error, revalidate } = useBrewOutdated({ backgroundRefresh: false });
  const upgrade = useBrewUpgrade();
  const { upgradeAll } = upgrade;
  const hasStartedRef = useRef(false);

  // Start once the (cached) outdated packages are listed, so the upgrade
  // doesn't run concurrently with the initial brew outdated fetch. Not after
  // a failed fetch with nothing to show: the failure view with Retry is the
  // recovery path, and a run started under it would bury it behind a toast.
  // "Nothing to show" must mean no packages, not no data — a cached empty
  // result is truthy yet renders the same failure view.
  const hasCachedPackages = data !== undefined && (data.formulae.length > 0 || data.casks.length > 0);
  useEffect(() => {
    if (!isLoading && !hasStartedRef.current && !(error && !hasCachedPackages)) {
      hasStartedRef.current = true;
      upgradeAll();
    }
  }, [isLoading, error, hasCachedPackages, upgradeAll]);

  const handleAction = useCallback(() => {
    // Show the refreshed results, rather than those fetched by the upgrade
    upgrade.reset();
    revalidate();
  }, [upgrade, revalidate]);

  return (
    <OutdatedList
      outdated={upgrade.outdated ?? data}
      isLoading={isLoading || upgrade.isUpgrading}
      filterType={filter}
      navigationTitle="Upgrade"
      searchBarPlaceholder={upgrade.isUpgrading ? "Upgrading…" : undefined}
      searchBarAccessory={<InstallableFilterDropdown onSelect={setFilter} />}
      icon={(item, isCask) => statusIcon(upgrade.states.get(upgradeKey({ name: item.name, isCask })))}
      onUpgrade={(item, isCask, status) => upgrade.setPackageState({ name: item.name, isCask }, { status })}
      onUpgradeAll={upgradeAll}
      actions={
        upgrade.isUpgrading ? (item) => <UpgradingActionPanel outdated={item} onCancel={upgrade.cancel} /> : undefined
      }
      onAction={handleAction}
      error={error}
      onRetry={revalidate}
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
