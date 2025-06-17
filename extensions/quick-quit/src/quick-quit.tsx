import { ActionPanel, Action, List, Icon, LocalStorage, getApplications, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import React, { useState, useEffect, useCallback } from "react";
import { getRelevantPrebuiltCategories } from "./utils";
import { Category } from "./types";

interface ActiveCategoriesData {
  activeCustomCategories: Category[];
  activePrebuiltCategories: Record<string, string[]>;
}

async function getRunningAppNames(): Promise<Set<string>> {
  const appleScript = `
    set appNames to {}
    tell application "System Events"
      set allProcesses to every process whose background only is false
      repeat with aProcess in allProcesses
        set end of appNames to name of aProcess
      end repeat
    end tell
    return appNames
  `;

  const output = await runAppleScript(appleScript);
  const names = output
    .trim()
    .split(", ")
    .map((name) => name.trim());

  return new Set(names);
}

async function loadActiveCategories(): Promise<ActiveCategoriesData> {
  const runningAppNames = await getRunningAppNames();
  const storedCustom = await LocalStorage.getItem<string>("categories");
  const customCategories: Category[] = storedCustom ? JSON.parse(storedCustom) : [];
  const allInstalledApps = await getApplications();
  const relevantPrebuilt = getRelevantPrebuiltCategories(allInstalledApps);

  const activeCustomCategories = customCategories
    .map((category) => {
      const runningApps = category.apps.filter((appName) => runningAppNames.has(appName));
      return { ...category, apps: runningApps };
    })
    .filter((category) => category.apps.length > 0);

  const activePrebuiltCategories: Record<string, string[]> = {};
  for (const [categoryName, apps] of Object.entries(relevantPrebuilt)) {
    const runningAppsInCategory = apps.filter((appName) => runningAppNames.has(appName));
    if (runningAppsInCategory.length > 0) {
      activePrebuiltCategories[categoryName] = runningAppsInCategory;
    }
  }
  return { activeCustomCategories, activePrebuiltCategories };
}

// 1. MODIFIED: The handleQuit function now accepts an `onSuccess` callback.
async function handleQuit(categoryName: string, appsToQuit: string[], onSuccess: () => Promise<void>) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Quitting ${categoryName} apps...`,
  });
  try {
    const quitPromises = appsToQuit.map((app) =>
      runAppleScript(`
        tell application ${JSON.stringify(app)} to quit
        delay 0.2
        tell application "System Events"
          repeat while (exists (processes where name is ${JSON.stringify(app)}))
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
  }>({ isLoading: true });

  const fetchData = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true }));
    try {
      const data = await loadActiveCategories();
      setState({ data, isLoading: false });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load active categories",
        message: error instanceof Error ? error.message : "An unknown error occurred",
      });
      setState({ isLoading: false });
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
      <List.Section title="Your Active Categories">
        {state.data?.activeCustomCategories.map((category) => (
          <List.Item
            key={category.id}
            icon={category.icon}
            title={category.name}
            subtitle={`${category.apps.length} app${category.apps.length === 1 ? "" : "s"} running`}
            actions={
              <ActionPanel>
                {/* 3. MODIFIED: We now pass `fetchData` as the callback to handleQuit. */}
                <Action
                  title={`Quit ${category.name}`}
                  onAction={() => handleQuit(category.name, category.apps, fetchData)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Active Default Categories">
        {Object.entries(state.data?.activePrebuiltCategories ?? {}).map(([categoryName, apps]) => (
          <List.Item
            key={categoryName}
            icon={Icon.HardDrive}
            title={categoryName}
            subtitle={`${apps.length} app${apps.length === 1 ? "" : "s"} running`}
            actions={
              <ActionPanel>
                {/* 3. MODIFIED: We also pass `fetchData` here. */}
                <Action title={`Quit ${categoryName}`} onAction={() => handleQuit(categoryName, apps, fetchData)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
