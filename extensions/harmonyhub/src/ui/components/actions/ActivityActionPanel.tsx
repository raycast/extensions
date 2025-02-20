/**
 * Action panel component for activity-related actions.
 * Provides start/stop activity controls and common actions.
 * @module
 */

import { ActionPanel, Action, Icon } from "@raycast/api";
import { memo } from "react";

/**
 * Props for the ActivityActionPanel component
 * @interface ActivityActionPanelProps
 */
interface ActivityActionPanelProps {
  /** Whether this is the currently running activity */
  isCurrentActivity: boolean;
  /** Callback to start the activity */
  onStartActivity: () => void;
  /** Callback to stop the activity */
  onStopActivity: () => void;
  /** Optional callback to refresh */
  onRefresh?: () => void;
  /** Optional callback to clear cache */
  onClearCache?: () => void;
  /** Optional callback to go back */
  onBack?: () => void;
}

/**
 * Component for displaying activity-related actions.
 * Shows start/stop controls based on activity status.
 * Includes common actions like refresh and clear cache.
 * @param props - Component props
 * @returns JSX element
 */
function ActivityActionPanelImpl({
  isCurrentActivity,
  onStartActivity,
  onStopActivity,
  onRefresh,
  onClearCache,
  onBack,
}: ActivityActionPanelProps): JSX.Element {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {!isCurrentActivity ? (
          <Action title="Start Activity" icon={Icon.Play} onAction={onStartActivity} />
        ) : (
          <Action title="Stop Activity" icon={Icon.Stop} onAction={onStopActivity} />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {onRefresh && <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />}
        {onClearCache && <Action title="Clear Cache" icon={Icon.Trash} onAction={onClearCache} />}
        {onBack && <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} />}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export const ActivityActionPanel = memo(ActivityActionPanelImpl);
