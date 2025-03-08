import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { fetchMacApps, getAllCategories } from "./utils";

import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";

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

  // Filter apps based on search text and category filter
  const filteredApps = useMemo(() => {
    if (!apps) return [];

    return apps.filter((app) => {
      const matchesSearch =
        searchText === "" ||
        app.name.toLowerCase().includes(searchText.toLowerCase()) ||
        app.description.toLowerCase().includes(searchText.toLowerCase()) ||
        app.categories.some((category) => category.toLowerCase().includes(searchText.toLowerCase()));

      const matchesCategory = !categoryFilter || app.categories.includes(categoryFilter);

      return matchesSearch && matchesCategory;
    });
  }, [apps, searchText, categoryFilter]);

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
        <List.Item
          key={app.name}
          title={app.name}
          subtitle={app.description}
          icon={app.iconUrl || Icon.AppWindow}
          accessories={[
            {
              text: app.categories.join(", "),
              tooltip: "Categories",
              icon: Icon.Tag,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open GitHub Repository" url={app.githubUrl} icon={Icon.CodeBlock} />
              <Action.CopyToClipboard
                title="Copy GitHub URL"
                content={app.githubUrl}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy App Name"
                content={app.name}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
