import {
  Action,
  ActionPanel,
  Icon,
  List,
  open,
  closeMainWindow,
} from "@raycast/api";
import { useState, useMemo } from "react";
import { VessloApp } from "./types";
import {
  runBrewUpgrade,
  runBrewUpgradeInTerminal,
  runMasUpgradeInTerminal,
} from "./utils/actions";
import { SORT_LABELS, SortOption, getSourceColor } from "./constants";
import { useVessloData } from "./utils/useVessloData";

export default function Updates() {
  const { data, isLoading } = useVessloData();
  const [sortBy, setSortBy] = useState<SortOption>("source");

  const appsWithUpdates = useMemo(() => {
    if (!data) return [];
    return data.apps.filter(
      (app) =>
        !app.isDeleted &&
        !app.isSkipped &&
        !app.isIgnored &&
        app.targetVersion !== null &&
        app.targetVersion !== undefined &&
        app.targetVersion !== "undefined" &&
        app.targetVersion.trim() !== "",
    );
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
  const appStoreApps = sortedApps.filter(
    (app) => app.sources.includes("App Store") && !app.sources.includes("Brew"),
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
          {Object.entries(SORT_LABELS).map(([key, label]) => (
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
          title={`Updates (${sortedApps.length}) - ${SORT_LABELS[sortBy]}`}
        >
          {sortedApps.map((app) => (
            <UpdateListItem key={app.id} app={app} />
          ))}
        </List.Section>
      )}
    </List>
  );
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

  // Determine source badge using centralized constants
  const primarySource = isHomebrew
    ? "Brew"
    : isAppStore
      ? "App Store"
      : isSparkle
        ? "Sparkle"
        : "Manual";
  const sourceBadge = {
    value: primarySource.toLowerCase(),
    color: getSourceColor(primarySource),
  };

  return (
    <List.Item
      icon={icon}
      title={app.name}
      subtitle={app.developer ?? ""}
      accessories={[{ text: versionInfo }, { tag: sourceBadge }]}
      actions={
        <ActionPanel>
          {/* Recommended: Vesslo Deep Link (Default) */}
          <ActionPanel.Section title="Recommended">
            {app.bundleId && (
              <Action
                title="Update in Vesslo"
                icon={Icon.Download}
                onAction={async () => {
                  await closeMainWindow();
                  open(`vesslo://update/${app.bundleId}`);
                }}
              />
            )}
          </ActionPanel.Section>

          {/* Alternative: Direct/Terminal */}
          <ActionPanel.Section title="Alternative">
            {isHomebrew && app.homebrewCask && (
              <Action
                title="Quick Update (Direct)"
                icon={Icon.ArrowDown}
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                onAction={() => runBrewUpgrade(app.homebrewCask!, app.name)}
              />
            )}
            {isHomebrew && app.homebrewCask && (
              <Action
                title="Update Via Terminal"
                icon={Icon.Terminal}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                onAction={() => runBrewUpgradeInTerminal(app.homebrewCask!)}
              />
            )}
            {isAppStore && app.appStoreId && (
              <Action.OpenInBrowser
                title="Open in App Store"
                icon={Icon.AppWindowList}
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                url={`macappstore://apps.apple.com/app/id${app.appStoreId}`}
              />
            )}
            {isAppStore && app.appStoreId && (
              <Action
                title="Update Via Terminal (Mas)"
                icon={Icon.Terminal}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                onAction={() => runMasUpgradeInTerminal(app.appStoreId!)}
              />
            )}
          </ActionPanel.Section>

          {/* General Actions */}
          <ActionPanel.Section>
            {!app.isDeleted && (
              <>
                <Action.Open title="Open App" target={app.path} />
                <Action.ShowInFinder path={app.path} />
              </>
            )}
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
