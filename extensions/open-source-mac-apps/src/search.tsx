import { List, showToast, Toast } from "@raycast/api";
import { fetchMacApps, getAllCategories } from "./utils";

import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { AppItem } from "./components/AppItem";
import { useFilteredApps } from "./hooks/useFilteredApps";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const { data: apps, isLoading, error } = usePromise(fetchMacApps);

  // Show error toast if fetching fails
  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to load Mac apps",
      message: error.message,
    });
  }

  // Get all categories for dropdown filter
  const categories = useMemo(() => {
    if (!apps) return [];
    return getAllCategories(apps);
  }, [apps]);

  // Use custom hook for filtering apps
  const filteredApps = useFilteredApps({ apps, searchText, categoryFilter });

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by name, description, or category..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Category"
          value={categoryFilter || ""}
          onChange={(newValue) => setCategoryFilter(newValue || null)}
        >
          <List.Dropdown.Item title="All Categories" value="" />
          {categories.map((category) => (
            <List.Dropdown.Item
              key={category.name}
              title={`${category.name} (${category.count})`}
              value={category.name}
            />
          ))}
        </List.Dropdown>
      }
    >
      {filteredApps.map((app) => (
        <AppItem key={app.name} app={app} />
      ))}
    </List>
  );
}
