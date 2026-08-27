/**
 * Outdated view for displaying outdated brew packages.
 *
 * Upgrades are reported via the toast/HUD, with the icon of each item
 * reflecting its upgrade status.
 */

import React, { useCallback, useState } from "react";
import { upgradeKey } from "./utils";
import { useBrewOutdated } from "./hooks/useBrewOutdated";
import { useBrewUpgrade } from "./hooks/useBrewUpgrade";
import { InstallableFilterDropdown, InstallableFilterType } from "./components/filter";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { UpgradingActionPanel } from "./components/actionPanels";
import { OutdatedList, statusIcon } from "./components/outdatedList";

function OutdatedContent() {
  const [filter, setFilter] = useState(InstallableFilterType.all);
  const { isLoading, isRefreshing, data, revalidate } = useBrewOutdated();
  const upgrade = useBrewUpgrade();

  const handleAction = useCallback(() => {
    upgrade.reset();
    revalidate();
  }, [upgrade, revalidate]);

  return (
    <OutdatedList
      outdated={upgrade.outdated ?? data}
      isLoading={isLoading || isRefreshing || upgrade.isUpgrading}
      filterType={filter}
      searchBarPlaceholder={upgrade.isUpgrading ? "Upgrading…" : undefined}
      searchBarAccessory={<InstallableFilterDropdown onSelect={setFilter} />}
      icon={(item, isCask) => statusIcon(upgrade.states.get(upgradeKey({ name: item.name, isCask })))}
      onUpgrade={(item, isCask, status) => upgrade.setPackageState({ name: item.name, isCask }, { status })}
      onUpgradeAll={upgrade.upgradeAll}
      actions={
        upgrade.isUpgrading ? (item) => <UpgradingActionPanel outdated={item} onCancel={upgrade.cancel} /> : undefined
      }
      onAction={handleAction}
    />
  );
}

export default function Main() {
  return (
    <ErrorBoundary>
      <OutdatedContent />
    </ErrorBoundary>
  );
}
