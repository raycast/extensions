import {
  ActionPanel,
  Action,
  List,
  Icon,
  LocalStorage,
  getApplications,
  confirmAlert,
  Alert,
  Toast,
  showToast,
  open,
  Application, // Import the Application type
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import React, { useState, useEffect, useCallback } from "react";
import { getRelevantPrebuiltCategories } from "./utils";
import { Category } from "./types";
import { CreateCategoryForm } from "./create-category";
import { CategoryAppList } from "./components/CategoryAppsDetail";
import { PREBUILT_CATEGORIES } from "./data/prebuilt-categories";
import { Keyboard } from "@raycast/api";

// 1. Update the data shape to include all installed apps
interface CategoriesData {
  customCategories: Category[];
  relevantPrebuilt: Record<string, { bundleId: string; name: string }[]>;
  installedApps: Application[];
}

export default function ManageCategoriesCommand() {
  const [state, setState] = useState<{ isLoading: boolean; data?: CategoriesData }>({ isLoading: true });

  const fetchData = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true }));
    try {
      const storedCustom = await LocalStorage.getItem<string>("categories");
      const customCategories: Category[] = storedCustom ? JSON.parse(storedCustom) : [];
      const installedApps = await getApplications(); // Get the list once
      const relevantPrebuilt = getRelevantPrebuiltCategories(installedApps);
      // 2. Save the list of installed apps to our state
      setState({ data: { customCategories, relevantPrebuilt, installedApps }, isLoading: false });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to load categories" });
      setState({ isLoading: false });
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDelete(categoryId: string) {
    if (
      await confirmAlert({
        title: "Delete Category?",
        message: "Are you sure you want to delete this category?",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const updatedCategories = state.data?.customCategories.filter((cat) => cat.id !== categoryId) ?? [];
      await LocalStorage.setItem("categories", JSON.stringify(updatedCategories));
      await showToast({ style: Toast.Style.Success, title: "Category Deleted" });
      fetchData();
    }
  }

  function generateDeepLink(id: string): string {
    const context = { categoryId: id };
    const encodedContext = encodeURIComponent(JSON.stringify(context));
    return `raycast://extensions/sriramHQ/quick-quit/execute-quit?context=${encodedContext}`;
  }

  return (
    <List isLoading={state.isLoading}>
      <List.Section title="Your Categories">
        {state.data?.customCategories.map((category) => (
          <List.Item
            key={category.id}
            icon={category.icon}
            title={category.name}
            subtitle={`${category.bundleIds.length} app${category.bundleIds.length === 1 ? "" : "s"}`}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Category"
                  icon={Icon.Pencil}
                  target={<CreateCategoryForm categoryId={category.id} onCategoryUpdated={fetchData} />}
                />
                <Action.CreateQuicklink
                  title="Create Quicklink"
                  icon={Icon.Link}
                  quicklink={{
                    link: generateDeepLink(category.id),
                    name: `Quick Quit - ${category.name}`,
                  }}
                />
                <Action
                  title="Manage Quicklinks"
                  icon={Icon.Cog}
                  onAction={() => open("raycast://extensions/raycast/raycast/search-quicklinks")}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
                />
                <ActionPanel.Section>
                  <Action
                    title="Delete"
                    style={Action.Style.Destructive}
                    icon={Icon.Trash}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => handleDelete(category.id)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Default Categories">
        {Object.entries(state.data?.relevantPrebuilt ?? {}).map(([categoryName, apps]) => (
          <List.Item
            key={categoryName}
            icon={Icon.HardDrive}
            title={categoryName}
            subtitle={`${apps.length} app${apps.length === 1 ? "" : "s"}`}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Apps"
                  icon={Icon.List}
                  target={
                    <CategoryAppList
                      categoryName={categoryName}
                      apps={PREBUILT_CATEGORIES[categoryName as keyof typeof PREBUILT_CATEGORIES]}
                      allApps={state.data?.installedApps ?? []}
                    />
                  }
                />
                <Action.CreateQuicklink
                  title="Create Quicklink"
                  icon={Icon.Link}
                  quicklink={{
                    link: generateDeepLink(categoryName),
                    name: `Quick Quit - ${categoryName}`,
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
