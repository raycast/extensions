import { ActionPanel, Action, List, Icon, LocalStorage, getApplications, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import React, { useState, useEffect, useCallback } from "react";
import { getRelevantPrebuiltCategories } from "./utils";
import { Category } from "./types";

interface ActiveCategoriesData {
  activeCustomCategories: Category[];
  activePrebuiltCategories: Record<string, string[]>;
}

// Utility to map bundle IDs to app names
function getAppNameFromBundleId(bundleId: string, installedApps: { bundleId: string; name: string }[]): string {
  const found = installedApps.find((app) => app.bundleId === bundleId);
  return found ? found.name : bundleId;
}

async function getRunningBundleIds(): Promise<Set<string>> {
  // AppleScript to get running application bundle IDs
  const appleScript = `
    set bundleIds to {}
    tell application "System Events"
      set allProcesses to every process whose background only is false
      repeat with aProcess in allProcesses
        try
          set end of bundleIds to bundle identifier of aProcess
        on error
          -- fallback: use name as bundle id if bundle identifier is not available
          set end of bundleIds to name of aProcess
        end try
      end repeat
    end tell
    return bundleIds
  `;

  const output = await runAppleScript(appleScript);
  const bundleIds = output
    .trim()
    .split(", ")
    .map((id) => id.trim());
  return new Set(bundleIds);
}

async function loadActiveCategories(): Promise<ActiveCategoriesData> {
  const runningBundleIds = await getRunningBundleIds();
  const storedCustom = await LocalStorage.getItem<string>("categories");
  const customCategories: Category[] = storedCustom ? JSON.parse(storedCustom) : [];
  const allInstalledApps = await getApplications();
  const relevantPrebuilt = getRelevantPrebuiltCategories(allInstalledApps);

  const activeCustomCategories = customCategories
    .map((category) => {
      const runningBundles = (category.bundleIds ?? []).filter((bundleId) => runningBundleIds.has(bundleId));
      return { ...category, bundleIds: runningBundles };
    })
    .filter((category) => category.bundleIds.length > 0);

  const activePrebuiltCategories: Record<string, string[]> = {};
  for (const [categoryName, bundleIds] of Object.entries(relevantPrebuilt)) {
    const runningBundlesInCategory = bundleIds.filter((bundleId) => runningBundleIds.has(bundleId.bundleId));
    if (runningBundlesInCategory.length > 0) {
      activePrebuiltCategories[categoryName] = runningBundlesInCategory.map((bundleId) => bundleId.bundleId);
    }
  }
  return { activeCustomCategories, activePrebuiltCategories };
}

// 1. MODIFIED: The handleQuit function now accepts an `onSuccess` callback.
async function handleQuit(categoryName: string, bundleIdsToQuit: string[], onSuccess: () => Promise<void>) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Quitting ${categoryName} apps...`,
  });
  try {
    const quitPromises = bundleIdsToQuit.map((bundleId) =>
      runAppleScript(`
        tell application id ${JSON.stringify(bundleId)} to quit
        delay 0.2
        tell application "System Events"
          repeat while (exists (processes where bundle identifier is ${JSON.stringify(bundleId)}))
            delay 0.2
          end repeat
        end tell
      `),
    );
    await Promise.all(quitPromises);
    toast.style = Toast.Style.Success;
    toast.title = `Successfully quit ${categoryName} apps`;

    // 2. MODIFIED: Instead of closing the window, we call the callback to refresh the list.
    await onSuccess();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to quit apps";
    toast.message = error instanceof Error ? error.message : "An unknown error occurred";
  }
}

export default function QuickQuitCommand() {
  const [state, setState] = useState<{
    isLoading: boolean;
    data?: ActiveCategoriesData;
    installedApps: { bundleId: string; name: string }[];
  }>({ isLoading: true, installedApps: [] });

  const fetchData = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true }));
    try {
      const allInstalledApps = (await getApplications()).filter(
        (app) => typeof app.bundleId === "string" && app.bundleId.length > 0,
      ) as { bundleId: string; name: string }[];
      const data = await loadActiveCategories();
      setState({ data, isLoading: false, installedApps: allInstalledApps });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load active categories",
        message: error instanceof Error ? error.message : "An unknown error occurred",
      });
      setState({ isLoading: false, installedApps: [] });
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <List isLoading={state.isLoading}>
      <List.EmptyView
        title="No Active Categories Found"
        description="None of the apps in your categories are currently running."
      />
      <List.Section title="Your Active Categories & Apps">
        {state.data?.activeCustomCategories.map((category) => (
          <List.Item
            key={category.id}
            title={category.name}
            icon={category.icon}
            subtitle={category.bundleIds
              .map((bundleId) => getAppNameFromBundleId(bundleId, state.installedApps))
              .join(", ")}
            actions={
              <ActionPanel>
                {/* 3. MODIFIED: We now pass `fetchData` as the callback to handleQuit. */}
                <Action
                  title={`Quit ${category.name}`}
                  icon={Icon.XMarkCircle}
                  onAction={() => handleQuit(category.name, category.bundleIds, fetchData)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Active Default Categories & Apps">
        {Object.entries(state.data?.activePrebuiltCategories ?? {}).map(([categoryName, bundleIds]) => (
          <List.Item
            key={categoryName}
            icon={Icon.HardDrive}
            title={categoryName}
            subtitle={bundleIds.map((bundleId) => getAppNameFromBundleId(bundleId, state.installedApps)).join(", ")}
            actions={
              <ActionPanel>
                {/* 3. MODIFIED: We also pass `fetchData` here. */}
                <Action
                  title={`Quit ${categoryName}`}
                  icon={Icon.XMarkCircle}
                  onAction={() => handleQuit(categoryName, bundleIds, fetchData)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
