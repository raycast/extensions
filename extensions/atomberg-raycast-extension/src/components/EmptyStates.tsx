import { List, ActionPanel, Action, Icon } from "@raycast/api";

/**
 * Props interface for empty state components
 */
interface EmptyStateProps {
  /** Optional callback function for refresh action */
  onAction?: () => void;
  /** Callback function to open extension preferences */
  onOpenPreferences: () => void;
}

/**
 * Empty state component displayed when API credentials are not configured
 *
 * @param props - The component props
 * @param props.onOpenPreferences - Callback function to open extension preferences
 *
 * @returns A List.EmptyView component prompting user to configure credentials
 */
export function CredentialsRequiredEmptyView({ onOpenPreferences }: Pick<EmptyStateProps, "onOpenPreferences">) {
  return (
    <List.EmptyView
      icon={Icon.Key}
      title="API Credentials Required"
      description="Please set your Atomberg API Key and Refresh Token in extension preferences"
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={onOpenPreferences} icon={Icon.Gear} />
        </ActionPanel>
      }
    />
  );
}

/**
 * Empty state component displayed when no devices are found
 *
 * @param props - The component props
 * @param props.onAction - Optional callback function for refresh action
 * @param props.onOpenPreferences - Callback function to open extension preferences
 *
 * @returns A List.EmptyView component with refresh and preferences actions
 */
export function NoDevicesEmptyView({ onAction, onOpenPreferences }: EmptyStateProps) {
  return (
    <List.EmptyView
      icon={Icon.House}
      title="No Devices Found"
      description="No Atomberg devices found in your account"
      actions={
        <ActionPanel>
          {onAction && <Action title="Refresh Devices" onAction={onAction} icon={Icon.ArrowClockwise} />}
          <Action title="Open Extension Preferences" onAction={onOpenPreferences} icon={Icon.Gear} />
        </ActionPanel>
      }
    />
  );
}
