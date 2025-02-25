/**
 * View component for displaying and selecting Harmony Hubs.
 * Shows discovered hubs with their connection status and version.
 * @module
 */

import { List, Icon, Action, ActionPanel } from "@raycast/api";
import { memo } from "react";

import { useHarmony } from "../../../hooks/useHarmony";
import { HarmonyHub, HarmonyStage } from "../../../types/core/harmony";
import { LoadingView } from "../LoadingView";

/**
 * Props for the HubsView component
 * @interface HubsViewProps
 */
interface HubsViewProps {
  /** Callback when a hub is selected */
  onHubSelect: (hub: HarmonyHub) => void;
  /** Optional callback to go back */
  onBack?: () => void;
}

/**
 * Component for displaying and selecting Harmony Hubs.
 * Shows discovered hubs with their connection status and firmware version.
 * Provides actions for selecting hubs and managing connections.
 * @param props - Component props
 * @returns JSX element
 */
function HubsViewImpl({ onHubSelect, onBack }: HubsViewProps): JSX.Element {
  const { hubs, refresh, clearCache, loadingState } = useHarmony();

  // Show loading view when discovering hubs
  if (loadingState.stage === HarmonyStage.DISCOVERING) {
    return (
      <LoadingView
        state={loadingState}
        icon={Icon.MagnifyingGlass}
        description="Searching for Harmony Hubs on your network..."
        onCancel={clearCache}
      />
    );
  }

  // Show empty state if no hubs found
  if (hubs.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="No Harmony Hubs Found"
          description="Make sure your Harmony Hub is powered on and connected to your network."
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              {clearCache && (
                <Action
                  title="Clear Cache"
                  icon={Icon.Trash}
                  onAction={clearCache}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                />
              )}
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      navigationTitle="Harmony Hubs"
      searchBarPlaceholder="Search hubs..."
      isLoading={loadingState.stage !== HarmonyStage.INITIAL && loadingState.stage !== HarmonyStage.ERROR}
      isShowingDetail={false}
    >
      {hubs.map((hub) => (
        <List.Item
          key={hub.id}
          title={hub.name}
          subtitle={hub.ip}
          icon={Icon.Network}
          accessories={[
            {
              text: hub.version || "Unknown Version",
              tooltip: "Hub firmware version",
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action title="Select Hub" icon={Icon.ArrowRight} onAction={() => onHubSelect(hub)} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                {refresh && (
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={refresh}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                )}
                {clearCache && (
                  <Action
                    title="Clear Cache"
                    icon={Icon.Trash}
                    onAction={clearCache}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  />
                )}
                {onBack && (
                  <Action
                    title="Back"
                    icon={Icon.ArrowLeft}
                    onAction={onBack}
                    shortcut={{ modifiers: ["cmd"], key: "[" }}
                  />
                )}
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export const HubsView = memo(HubsViewImpl);
