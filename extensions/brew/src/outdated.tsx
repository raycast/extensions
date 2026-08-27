/**
 * Outdated view for displaying outdated brew packages.
 */

import React, { useState } from "react";
import { useBrewOutdated } from "./hooks/useBrewOutdated";
import { InstallableFilterDropdown, InstallableFilterType } from "./components/filter";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { OutdatedList } from "./components/outdatedList";

function OutdatedContent() {
  const [filter, setFilter] = useState(InstallableFilterType.all);
  const { isLoading, isRefreshing, data, revalidate } = useBrewOutdated();

  return (
    <OutdatedList
      outdated={data}
      isLoading={isLoading || isRefreshing}
      filterType={filter}
      searchBarAccessory={<InstallableFilterDropdown onSelect={setFilter} />}
      onAction={() => revalidate()}
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
