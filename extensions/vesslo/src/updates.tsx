import { Action, ActionPanel, Icon, List, Color } from "@raycast/api";
import { useState, useMemo } from "react";
import { VessloApp } from "./types";
import {
  getAppStoreUrl,
  openInVesslo,
  openUpdateInVesslo,
  runBrewUpgrade,
  runBrewUpgradeInTerminal,
  runMasUpgradeInTerminal,
} from "./utils/actions";
import { SORT_LABELS, SortOption } from "./constants";
import { useVessloData } from "./utils/useVessloData";
import { isUpdatableApp, updateRouteGroup } from "./utils/update-filter";
import { normalizeBrewCaskToken } from "./utils/brew";

export default function Updates() {
  const { data, isLoading } = useVessloData();
  const [sortBy, setSortBy] = useState<SortOption>("source");

  const appsWithUpdates = useMemo(() => {
    if (!data) return [];
    return data.apps.filter((app) => isUpdatableApp(app));
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
  const homebrewApps = sortedApps.filter(
    (app) => updateRouteGroup(app) === "homebrew",
  );
  const sparkleApps = sortedApps.filter(
    (app) => updateRouteGroup(app) === "sparkle",
  );
  const appStoreApps = sortedApps.filter(
    (app) => updateRouteGroup(app) === "appStore",
  );
  const otherApps = sortedApps.filter(
    (app) => updateRouteGroup(app) === "manual",
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

  const routeGroup = updateRouteGroup(app);
  const isHomebrew = routeGroup === "homebrew";
  const isSparkle = routeGroup === "sparkle";
  const isAppStore = routeGroup === "appStore";
  const caskToken = isHomebrew
    ? normalizeBrewCaskToken(app.homebrewCask)
    : null;
  const appStoreUrl = isAppStore ? getAppStoreUrl(app.appStoreId) : null;
  const canRunMas =
    app.primaryActionKind === "runAppStore" && appStoreUrl !== null;
  const recommendedAppStoreUrl =
    app.primaryActionKind === "openAppStore" ? appStoreUrl : null;

  // Determine source badge
  let sourceBadge = { value: "manual", color: Color.SecondaryText };
  if (isHomebrew) {
    sourceBadge = { value: "brew", color: Color.Orange };
  } else if (isSparkle) {
    sourceBadge = { value: "sparkle", color: Color.Green };
  } else if (isAppStore) {
    sourceBadge = { value: "appStore", color: Color.Blue };
  }

  return (
    <List.Item
      icon={icon}
      title={app.name}
      subtitle={app.developer ?? ""}
      accessories={[{ text: versionInfo }, { tag: sourceBadge }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Recommended">
            {recommendedAppStoreUrl ? (
              <Action.OpenInBrowser
                title="Open in App Store"
                icon={Icon.AppWindowList}
                url={recommendedAppStoreUrl}
              />
            ) : app.bundleId ? (
              <Action
                title="Update in Vesslo"
                icon={Icon.Download}
                onAction={() => openUpdateInVesslo(app.bundleId!)}
              />
            ) : appStoreUrl ? (
              <Action.OpenInBrowser
                title="Open in App Store"
                icon={Icon.AppWindowList}
                url={appStoreUrl}
              />
            ) : (
              <Action.Open title="Open App" target={app.path} />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Alternative">
            {caskToken && (
              <Action
                title="Quick Update (Direct)"
                icon={Icon.ArrowDown}
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                onAction={() => runBrewUpgrade(caskToken, app.name)}
              />
            )}
            {caskToken && (
              <Action
                title="Update Via Terminal"
                icon={Icon.Terminal}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                onAction={() => runBrewUpgradeInTerminal(caskToken)}
              />
            )}
            {!recommendedAppStoreUrl && appStoreUrl && (
              <Action.OpenInBrowser
                title="Open in App Store"
                icon={Icon.AppWindowList}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                url={appStoreUrl}
              />
            )}
            {canRunMas && (
              <Action
                title="Update Via Terminal (Mas)"
                icon={Icon.Terminal}
                shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                onAction={() => runMasUpgradeInTerminal(app.appStoreId!)}
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
                onAction={() => openInVesslo(app.bundleId!)}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
