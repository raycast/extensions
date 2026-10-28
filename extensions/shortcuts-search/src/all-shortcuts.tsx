import { useState } from "react";
import { useApps } from "./load/apps-provider";
import type { AppsFilter } from "./user-data/view-models";
import { AppsList } from "./view/apps-list";

export default function AllShortcutsCommand() {
  const [filter, setFilter] = useState<AppsFilter>("all");
  const { isLoading, accountError, data: apps, customizations, favorites, toggleFavorite } = useApps(filter !== "all");

  return (
    <AppsList
      apps={apps}
      customizations={customizations}
      favorites={favorites}
      filter={filter}
      isLoading={isLoading}
      accountError={accountError}
      onFilterChange={setFilter}
      onToggleFavorite={toggleFavorite}
    />
  );
}
