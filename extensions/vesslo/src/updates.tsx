import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
  open,
  Color,
  closeMainWindow,
} from "@raycast/api";
import { useState, useMemo, useEffect } from "react";
import { loadVessloData } from "./utils/data";
import { VessloApp, VessloData } from "./types";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

type SortOption = "source" | "name" | "nameDesc" | "developer";

const sortLabels: Record<SortOption, string> = {
  source: "By Source",
  name: "By Name (A-Z)",
  nameDesc: "By Name (Z-A)",
  developer: "By Developer",
};

export default function Updates() {
  const [data, setData] = useState<VessloData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("source");

  useEffect(() => {
    const loaded = loadVessloData();
    setData(loaded);
    setIsLoading(false);

    if (!loaded) {
      showToast({
        style: Toast.Style.Failure,
        title: "Vesslo data not found",
        message: "Please run Vesslo app first",
      });
    }
  }, []);

  const appsWithUpdates = useMemo(() => {
    if (!data) return [];
    return data.apps.filter((app) => app.targetVersion !== null);
  }, [data]);

  // Sort apps based on sortBy option
  const sortedApps = useMemo(() => {
    const apps = [...appsWithUpdates];
    switch (sortBy) {
      case "name":
        return apps.sort((a, b) => a.name.localeCompare(b.name));
      case "nameDesc":
        return apps.sort((a, b) => b.name.localeCompare(a.name));
      case "developer":
        return apps.sort((a, b) =>
          (a.developer ?? "").localeCompare(b.developer ?? ""),
        );
      case "source":
      default:
        return apps; // Keep original order for source grouping
    }
  }, [appsWithUpdates, sortBy]);

  // Group by source (only used when sortBy === "source")
  const homebrewApps = sortedApps.filter((app) => app.sources.includes("Brew"));
  const sparkleApps = sortedApps.filter(
    (app) => app.sources.includes("Sparkle") && !app.sources.includes("Brew"),
  );
  const appStoreApps = sortedApps.filter((app) =>
    app.sources.includes("App Store"),
  );
  const otherApps = sortedApps.filter(
    (app) =>
      !app.sources.includes("Brew") &&
      !app.sources.includes("Sparkle") &&
      !app.sources.includes("App Store"),
  );

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort By"
          storeValue
          onChange={(value) => setSortBy(value as SortOption)}
        >
          {Object.entries(sortLabels).map(([key, label]) => (
            <List.Dropdown.Item key={key} title={label} value={key} />
          ))}
        </List.Dropdown>
      }
    >
      {!data ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Vesslo data not found"
          description="Please run Vesslo app to export data"
        />
      ) : appsWithUpdates.length === 0 ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="All apps are up to date!"
          description="No updates available"
        />
      ) : sortBy === "source" ? (
        // Grouped by source
        <>
          {homebrewApps.length > 0 && (
            <List.Section title={`Homebrew (${homebrewApps.length})`}>
              {homebrewApps.map((app) => (
                <UpdateListItem key={app.id} app={app} />
              ))}
            </List.Section>
          )}
          {sparkleApps.length > 0 && (
            <List.Section title={`Sparkle (${sparkleApps.length})`}>
              {sparkleApps.map((app) => (
                <UpdateListItem key={app.id} app={app} />
              ))}
            </List.Section>
          )}
          {appStoreApps.length > 0 && (
            <List.Section title={`App Store (${appStoreApps.length})`}>
              {appStoreApps.map((app) => (
                <UpdateListItem key={app.id} app={app} />
              ))}
            </List.Section>
          )}
          {otherApps.length > 0 && (
            <List.Section title={`Manual (${otherApps.length})`}>
              {otherApps.map((app) => (
                <UpdateListItem key={app.id} app={app} />
              ))}
            </List.Section>
          )}
        </>
      ) : (
        // Flat list (sorted by name or developer)
        <List.Section
          title={`Updates (${sortedApps.length}) - ${sortLabels[sortBy]}`}
        >
          {sortedApps.map((app) => (
            <UpdateListItem key={app.id} app={app} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

async function runBrewUpgrade(caskName: string, appName: string) {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: `Updating ${appName}...`,
      message: `brew upgrade --cask ${caskName}`,
    });

    const { stdout } = await execAsync(
      `/opt/homebrew/bin/brew upgrade --cask ${caskName}`,
    );

    await showToast({
      style: Toast.Style.Success,
      title: `${appName} updated!`,
      message: stdout || "Update complete",
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to update ${appName}`,
      message: errorMessage,
    });
  }
}

function UpdateListItem({ app }: { app: VessloApp }) {
  const versionInfo = `${app.version} → ${app.targetVersion}`;

  // Create icon from base64 or use default
  const icon = app.icon
    ? { source: `data:image/png;base64,${app.icon}` }
    : Icon.AppWindow;

  // Check sources (use actual rawValue from Swift: "Brew", "Sparkle", "App Store")
  const isHomebrew = app.sources.includes("Brew");
  const isSparkle = app.sources.includes("Sparkle");
  const isAppStore = app.sources.includes("App Store");

  // Determine source badge
  let sourceBadge = { value: "manual", color: Color.SecondaryText };
  if (isHomebrew) {
    sourceBadge = { value: "brew", color: Color.Orange };
  } else if (isAppStore) {
    sourceBadge = { value: "appStore", color: Color.Blue };
  } else if (isSparkle) {
    sourceBadge = { value: "sparkle", color: Color.Green };
  }

  return (
    <List.Item
      icon={icon}
      title={app.name}
      subtitle={app.developer ?? ""}
      accessories={[{ text: versionInfo }, { tag: sourceBadge }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Update">
            {/* Primary action based on source */}
            {isHomebrew && app.homebrewCask && (
              <Action
                title="Update Via Homebrew"
                icon={Icon.ArrowDown}
                onAction={() => runBrewUpgrade(app.homebrewCask!, app.name)}
              />
            )}
            {isAppStore && app.appStoreId && (
              <Action.OpenInBrowser
                title="Open in App Store"
                icon={Icon.AppWindowList}
                url={`macappstore://apps.apple.com/app/id${app.appStoreId}`}
              />
            )}
            {isSparkle && app.bundleId && (
              <Action
                title="Update in Vesslo"
                icon={Icon.Download}
                onAction={async () => {
                  await closeMainWindow();
                  open(`vesslo://app/${app.bundleId}`);
                }}
              />
            )}
            {/* Fallback for other sources */}
            {!isHomebrew && !isAppStore && !isSparkle && app.bundleId && (
              <Action
                title="Open in Vesslo"
                icon={Icon.Link}
                onAction={async () => {
                  await closeMainWindow();
                  open(`vesslo://app/${app.bundleId}`);
                }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Open title="Open App" target={app.path} />
            <Action.ShowInFinder path={app.path} />
            {app.bundleId && (
              <Action
                title="Open in Vesslo"
                icon={Icon.Link}
                onAction={async () => {
                  await closeMainWindow();
                  open(`vesslo://app/${app.bundleId}`);
                }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
