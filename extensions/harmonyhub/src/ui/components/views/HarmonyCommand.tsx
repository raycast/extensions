/**
 * Main component for the Harmony Control extension.
 * Manages view state and renders appropriate sub-components.
 * @module
 */

import { List, Icon, Action, ActionPanel } from "@raycast/api";
import React, { useEffect, useRef, useCallback, useMemo } from "react";
import { memo } from "react";

import { useHarmony } from "../../../hooks/useHarmony";
import { debug, info } from "../../../services/logger";
import { useViewStore } from "../../../stores/view";
import { HarmonyCommand as HarmonyCommandType, HarmonyDevice, HarmonyActivity } from "../../../types/core/harmony";
import { View } from "../../../types/core/views";

import { ActivitiesView } from "./ActivitiesView";
import { CommandsView } from "./CommandsView";
import { DevicesView } from "./DevicesView";
import { HubsView } from "./HubsView";

/**
 * Props for the CommandItem component
 * @interface CommandItemProps
 */
interface CommandItemProps {
  /** Command to display */
  command: HarmonyCommandType;
  /** Callback when command is executed */
  onExecute: () => void;
  /** Optional callback to go back */
  onBack?: () => void;
}

/**
 * Component for displaying a single command with actions
 * @param props - Component props
 * @returns JSX element
 */
function CommandItemImpl({ command, onExecute, onBack }: CommandItemProps): JSX.Element {
  return (
    <List.Item
      title={command.label}
      subtitle={command.name}
      icon={Icon.Terminal}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Execute Command" icon={Icon.Terminal} onAction={onExecute} />
          </ActionPanel.Section>
          {onBack && (
            <ActionPanel.Section>
              <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}

/** Memoized version of CommandItem */
export const CommandItem = memo(CommandItemImpl);

/**
 * Main component for the Harmony Control extension.
 * Manages view state and renders the appropriate view component based on current state.
 * Handles automatic view transitions and hub discovery.
 * @returns JSX element
 */
export function HarmonyCommand(): React.ReactElement {
  const { hubs, selectedHub, devices, activities, loadingState, error, connect, refresh, startActivity } = useHarmony();

  const currentView = useViewStore((state) => state.currentView);
  const selectedDevice = useViewStore((state) => state.selectedDevice);
  const isMounted = useRef(false);
  const viewStore = useViewStore();

  // Start hub discovery only on initial mount
  useEffect(() => {
    if (!isMounted.current) {
      info("HarmonyCommand mounted, starting refresh");
      refresh();
      isMounted.current = true;
    }
  }, [refresh]);

  // Log state changes for debugging
  useEffect(() => {
    debug("State updated", {
      currentView,
      hubCount: hubs.length,
      selectedHub: selectedHub?.name,
      deviceCount: devices.length,
      activityCount: activities.length,
      loadingState: loadingState?.stage,
      hasError: !!error,
    });
  }, [currentView, hubs, selectedHub, devices, activities, loadingState, error]);

  // Handle view transitions based on state
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    // If we have a selected hub but no devices are showing, switch to hubs view
    if (!selectedHub && currentView !== View.HUBS) {
      info("No hub selected, switching to hubs view");
      timeoutId = setTimeout(() => {
        viewStore.changeView(View.HUBS);
      }, 0);
    }
    // If we have a selected hub and devices, switch from hubs view
    else if (selectedHub && devices.length > 0 && currentView === View.HUBS) {
      info("Hub selected with devices, switching from hubs view");
      timeoutId = setTimeout(() => {
        viewStore.changeView(View.DEVICES);
      }, 0);
    }

    // Cleanup timeout on unmount or deps change
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [selectedHub, devices.length, currentView, viewStore]);

  // Handle device detail view transitions
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (currentView === View.DEVICE_DETAIL && !selectedDevice) {
      info("No device selected, switching to devices view");
      timeoutId = setTimeout(() => {
        viewStore.changeView(View.DEVICES);
      }, 0);
    }

    // Cleanup timeout on unmount or deps change
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [currentView, selectedDevice, viewStore]);

  // Memoize device selection handler
  const handleDeviceSelect = useCallback(
    (device: HarmonyDevice) => {
      debug("Device selected", { device: device.name });
      setTimeout(() => {
        viewStore.selectDevice(device);
      }, 0);
    },
    [viewStore],
  );

  // Memoize activity selection handler
  const handleActivitySelect = useCallback(
    (activity: HarmonyActivity) => {
      debug("Activity selected", { activity: activity.name });
      startActivity(activity.id);
    },
    [startActivity],
  );

  // Handle view rendering based on current view state
  debug("Rendering view", { currentView });

  // Memoize view components to prevent unnecessary rerenders
  const viewComponents = useMemo(
    () =>
      ({
        [View.HUBS]: <HubsView onHubSelect={connect} />,
        [View.DEVICES]: <DevicesView onDeviceSelect={handleDeviceSelect} />,
        [View.DEVICE_DETAIL]: selectedDevice ? (
          <CommandsView commands={selectedDevice.commands} onBack={() => viewStore.changeView(View.DEVICES)} />
        ) : (
          <DevicesView onDeviceSelect={handleDeviceSelect} />
        ),
        [View.ACTIVITIES]: <ActivitiesView onActivitySelect={handleActivitySelect} />,
      }) as Record<View, React.ReactElement>,
    [connect, handleDeviceSelect, handleActivitySelect, selectedDevice, viewStore],
  );

  // Return the appropriate view component
  return viewComponents[currentView] || viewComponents[View.HUBS];
}
