import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
  open,
  Color,
} from "@raycast/api";
import { useState, useMemo, useEffect } from "react";
import { loadVessloData } from "./utils/data";
import { VessloApp, VessloData } from "./types";

interface SearchResult {
  app: VessloApp;
  matchedFields: string[]; // ["developer", "memo", "tag"]
}

export default function SearchApps() {
  const [searchText, setSearchText] = useState("");
  const [data, setData] = useState<VessloData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const searchResults = useMemo((): SearchResult[] => {
    if (!data) return [];

    const query = searchText.toLowerCase();
    if (!query) {
      return data.apps.map((app) => ({ app, matchedFields: [] }));
    }

    return data.apps
      .map((app) => {
        const matchedFields: string[] = [];

        // Check each field (skip app name - user doesn't want that shown)
        if (app.name.toLowerCase().includes(query)) {
          // Don't add to matchedFields - user said app name is not needed
        }
        if (app.developer?.toLowerCase().includes(query)) {
          matchedFields.push("developer");
        }
        if (app.memo?.toLowerCase().includes(query)) {
          matchedFields.push("memo");
        }
        if (app.tags.some((tag) => tag.toLowerCase().includes(query))) {
          matchedFields.push("tag");
        }

        // Include if any field matches
        const matches =
          app.name.toLowerCase().includes(query) || matchedFields.length > 0;

        return matches ? { app, matchedFields } : null;
      })
      .filter((result): result is SearchResult => result !== null);
  }, [data, searchText]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search apps by name, developer, tag, or memo..."
      onSearchTextChange={setSearchText}
    >
      {!data ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Vesslo data not found"
          description="Please run Vesslo app to export data"
        />
      ) : searchResults.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No apps found"
          description="Try a different search term"
        />
      ) : (
        searchResults.map((result) => (
          <AppListItem
            key={result.app.id}
            app={result.app}
            matchedFields={result.matchedFields}
          />
        ))
      )}
    </List>
  );
}

function AppListItem({
  app,
  matchedFields,
}: {
  app: VessloApp;
  matchedFields: string[];
}) {
  const subtitle = [app.version, app.developer, ...app.tags.map((t) => `#${t}`)]
    .filter(Boolean)
    .join(" • ");

  const accessories: List.Item.Accessory[] = [];

  // Show matched field indicators (only when searching)
  if (matchedFields.length > 0) {
    matchedFields.forEach((field) => {
      let icon: Icon;
      let color: Color;
      let tooltip: string;

      switch (field) {
        case "developer":
          icon = Icon.Person;
          color = Color.Blue;
          tooltip = "Matched: Developer";
          break;
        case "memo":
          icon = Icon.Document;
          color = Color.Orange;
          tooltip = "Matched: Memo";
          break;
        case "tag":
          icon = Icon.Tag;
          color = Color.Purple;
          tooltip = "Matched: Tag";
          break;
        default:
          icon = Icon.Circle;
          color = Color.SecondaryText;
          tooltip = "Matched";
      }

      accessories.push({ icon: { source: icon, tintColor: color }, tooltip });
    });
  }

  // Update badge
  if (app.targetVersion) {
    accessories.push({ tag: { value: "UPDATE", color: Color.Green } });
  }

  // Source badges (use actual rawValue: "Brew", "Sparkle", "App Store")
  app.sources.forEach((source) => {
    const color =
      source === "Brew"
        ? Color.Orange
        : source === "App Store"
          ? Color.Blue
          : source === "Sparkle"
            ? Color.Green
            : Color.SecondaryText;
    accessories.push({ tag: { value: source, color } });
  });

  // Create icon from base64 or use default
  const icon = app.icon
    ? { source: `data:image/png;base64,${app.icon}` }
    : Icon.AppWindow;

  return (
    <List.Item
      icon={icon}
      title={app.name}
      subtitle={subtitle}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Open title="Open App" target={app.path} />
            <Action.ShowInFinder path={app.path} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Open in Vesslo"
              icon={Icon.Link}
              onAction={() => {
                if (app.bundleId) {
                  open(`vesslo://app/${app.bundleId}`);
                }
              }}
            />
            {app.bundleId && (
              <Action.CopyToClipboard
                title="Copy Bundle Id"
                content={app.bundleId}
              />
            )}
          </ActionPanel.Section>
          {app.targetVersion && (
            <ActionPanel.Section title="Update">
              {app.sources.includes("Brew") && app.homebrewCask && (
                <Action.OpenInBrowser
                  title="Update Via Homebrew"
                  icon={Icon.Terminal}
                  url={`raycast://script-command/run?script=brew%20upgrade%20--cask%20${app.homebrewCask}`}
                />
              )}
              {app.sources.includes("App Store") && app.appStoreId && (
                <Action.OpenInBrowser
                  title="Open in App Store"
                  url={`macappstore://apps.apple.com/app/id${app.appStoreId}`}
                />
              )}
              {app.sources.includes("Sparkle") && app.bundleId && (
                <Action
                  title="Update in Vesslo"
                  icon={Icon.Download}
                  onAction={() => open(`vesslo://app/${app.bundleId}`)}
                />
              )}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
