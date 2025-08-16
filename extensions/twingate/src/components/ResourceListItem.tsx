import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  open,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { ResourceListItem as ResourceData, RecentResource } from "../types";
import { DebugLogger } from "../utils/debug";
import { ParsedShortcut } from "../utils/shortcuts";

interface ResourceListItemProps {
  resource: ResourceData | RecentResource;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpen: () => void;
  showRecentTime?: boolean; // Whether to show "Recent" badge for recent resources
  debugMode?: boolean; // Current debug mode state
  onToggleDebugMode?: () => Promise<void>; // Function to toggle debug mode
  shortcuts?: {
    toggleFavorite: ParsedShortcut;
    copyUrl: ParsedShortcut;
    copyAddress: ParsedShortcut;
    copyAlias: ParsedShortcut;
    copyName: ParsedShortcut;
    openMainSearch: ParsedShortcut;
    debugMode: ParsedShortcut;
    exportLogs: ParsedShortcut;
  };
}

export function ResourceListItem({
  resource,
  isFavorite,
  onToggleFavorite,
  onOpen,
  showRecentTime = false,
  debugMode = false,
  onToggleDebugMode,
  shortcuts,
}: ResourceListItemProps) {
  // Handle both ResourceListItem and RecentResource types
  const subtitle = resource.alias
    ? `${resource.address} → ${resource.alias}`
    : resource.address;

  const accessories = [
    { text: resource.networkName, icon: Icon.Network },
    {
      icon: resource.alias ? Icon.Link : Icon.Dot,
      tooltip: resource.alias ? "Has alias" : "Direct access",
    },
  ];

  // Add recent time for recent resources
  if (showRecentTime && "timestamp" in resource) {
    const timeAgo = new Date(resource.timestamp).toLocaleString();
    accessories.push({
      icon: Icon.Clock,
      tooltip: `Last accessed: ${timeAgo}`,
    });
  }

  const handleResourceOpen = async () => {
    try {
      onOpen(); // Track the resource access
      await open(resource.url); // Open the resource URL in browser
    } catch (error) {
      console.error("Failed to access resource", error);
    }
  };

  return (
    <List.Item
      title={resource.name}
      subtitle={subtitle}
      accessories={accessories}
      icon={{
        source: isFavorite
          ? Icon.Star
          : showRecentTime
            ? Icon.Clock
            : Icon.Globe,
        tintColor: isFavorite ? Color.Yellow : Color.Blue,
      }}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Access">
            <Action
              title="Open in Browser"
              icon={Icon.Globe}
              onAction={handleResourceOpen}
            />
            {showRecentTime && (
              <Action
                title="Open Main Search"
                icon={Icon.MagnifyingGlass}
                onAction={async () => {
                  await import("@raycast/api").then((api) =>
                    api.launchCommand({
                      name: "search-resources",
                      type: api.LaunchType.UserInitiated,
                      context: { searchText: resource.name },
                    }),
                  );
                }}
                shortcut={shortcuts?.openMainSearch}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Favorites">
            <Action
              title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              icon={isFavorite ? Icon.StarDisabled : Icon.Star}
              onAction={onToggleFavorite}
              shortcut={shortcuts?.toggleFavorite}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy URL"
              content={resource.url}
              icon={Icon.Clipboard}
              shortcut={shortcuts?.copyUrl}
            />
            <Action.CopyToClipboard
              title="Copy Address"
              content={resource.address}
              icon={Icon.Network}
              shortcut={shortcuts?.copyAddress}
            />
            {resource.alias && (
              <Action.CopyToClipboard
                title="Copy Alias"
                content={resource.alias}
                icon={Icon.Link}
                shortcut={shortcuts?.copyAlias}
              />
            )}
            <Action.CopyToClipboard
              title="Copy Resource Name"
              content={resource.name}
              icon={Icon.Text}
              shortcut={shortcuts?.copyName}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Debug">
            {onToggleDebugMode && (
              <Action
                title={`Debug Mode: ${debugMode ? "On" : "Off"}`}
                icon={debugMode ? Icon.Bug : Icon.CodeBlock}
                onAction={onToggleDebugMode}
                shortcut={shortcuts?.debugMode}
              />
            )}
            <Action
              title="Export Debug Logs"
              icon={Icon.Document}
              onAction={async () => {
                try {
                  const logs = DebugLogger.exportLogs();
                  await Clipboard.copy(logs);
                  const stats = DebugLogger.getDebugStats();
                  showToast({
                    style: Toast.Style.Success,
                    title: "Debug Logs Exported",
                    message: `${stats.logCount} logs copied to clipboard`,
                  });
                } catch (error) {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Export Failed",
                    message: "Please try again",
                  });
                }
              }}
              shortcut={shortcuts?.exportLogs}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
