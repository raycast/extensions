import { Action, ActionPanel, Icon, List } from "@raycast/api";

import { Logger } from "../services/logger";

/**
 * Props for the FeedbackState component.
 */
export interface FeedbackStateProps {
  /** The title to display */
  title: string;
  /** Optional description text */
  description?: string;
  /** The icon to display */
  icon?: Icon | { source: string };
  /** The color of the icon */
  color?: Color;
  /** Optional actions to display */
  actions?: React.ReactNode;
  /** Optional error object */
  error?: HarmonyError;
  /** Optional retry callback */
  onRetry?: () => void;
  /** Optional reconnect callback */
  onReconnect?: () => void;
  /** Optional clear cache callback */
  onClearCache?: () => void;
  /** Optional reset config callback */
  onResetConfig?: () => void;
}

/**
 * Type guard to check if an icon is a Raycast Icon enum
 */
function isRaycastIcon(icon: Icon | { source: string } | undefined): icon is Icon {
  return typeof icon === "string";
}

/**
 * Get icon and color based on error severity
 */
function getErrorDisplay(error?: HarmonyError): { icon: Icon; color: Color } {
  if (!error) return { icon: Icon.Circle, color: Color.PrimaryText };

  switch (error.severity) {
    case ErrorSeverity.CRITICAL:
      return { icon: Icon.ExclamationMark, color: Color.Red };
    case ErrorSeverity.ERROR:
      return { icon: Icon.Warning, color: Color.Orange };
    case ErrorSeverity.WARNING:
      return { icon: Icon.QuestionMark, color: Color.Yellow };
    case ErrorSeverity.INFO:
      return { icon: Icon.Info, color: Color.Blue };
    default:
      return { icon: Icon.ExclamationMark, color: Color.Red };
  }
}

/**
 * Get recovery actions based on error recovery strategy
 */
function getRecoveryActions(
  error: HarmonyError,
  callbacks: {
    onRetry?: () => void;
    onReconnect?: () => void;
    onClearCache?: () => void;
    onResetConfig?: () => void;
  },
): React.ReactNode {
  const strategy = error.getRecoveryStrategy();
  if (!strategy) return null;

  const actions: React.ReactNode[] = [];

  strategy.actions.forEach((action) => {
    switch (action) {
      case ErrorRecoveryAction.RETRY:
        if (callbacks.onRetry) {
          actions.push(
            <Action
              key="retry"
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={() => {
                Logger.debug("Retrying action");
                callbacks.onRetry?.();
              }}
            />,
          );
        }
        break;
      case ErrorRecoveryAction.RECONNECT:
        if (callbacks.onReconnect) {
          actions.push(
            <Action
              key="reconnect"
              title="Reconnect"
              icon={Icon.Link}
              onAction={() => {
                Logger.debug("Reconnecting to hub");
                callbacks.onReconnect?.();
              }}
            />,
          );
        }
        break;
      case ErrorRecoveryAction.CLEAR_CACHE:
        if (callbacks.onClearCache) {
          actions.push(
            <Action
              key="clearCache"
              title="Clear Cache"
              icon={Icon.Trash}
              onAction={() => {
                Logger.debug("Clearing cache");
                callbacks.onClearCache?.();
              }}
            />,
          );
        }
        break;
      case ErrorRecoveryAction.RESET_CONFIG:
        if (callbacks.onResetConfig) {
          actions.push(
            <Action
              key="resetConfig"
              title="Reset Configuration"
              icon={Icon.Gear}
              onAction={() => {
                Logger.debug("Resetting configuration");
                callbacks.onResetConfig?.();
              }}
            />,
          );
        }
        break;
    }
  });

  if (actions.length === 0) return null;

  return <ActionPanel>{actions}</ActionPanel>;
}

/**
 * Get formatted error message with recovery suggestions
 */
function getErrorMessage(error: HarmonyError, description?: string): string {
  const messages: string[] = [];

  if (description) {
    messages.push(description);
  }

  messages.push(error.message);

  const strategy = error.getRecoveryStrategy();
  if (strategy && !strategy.automatic) {
    const recoveryMessage = error instanceof HarmonyError ? error.recoveryMessage : null;
    if (recoveryMessage) {
      messages.push(recoveryMessage);
    }
  }

  return messages.join("\n\n");
}

/**
 * FeedbackState component displays various application states with consistent styling.
 * Used for showing loading, error, and empty states throughout the application.
 *
 * @example
 * ```tsx
 * <FeedbackState
 *   title="No Devices Found"
 *   description="Please check your network connection"
 *   icon={Icon.Circle}
 *   error={error}
 *   onRetry={() => refetchDevices()}
 * />
 * ```
 */
export const FeedbackState: React.FC<FeedbackStateProps> = ({
  title,
  description,
  icon,
  color = Color.PrimaryText,
  actions,
  error,
  onRetry,
  onReconnect,
  onClearCache,
  onResetConfig,
}): JSX.Element => {
  // Get error display properties
  const errorDisplay = error ? getErrorDisplay(error) : undefined;

  // Use provided icon/color or error-based ones
  const iconSource = isRaycastIcon(icon) ? icon : icon?.source || errorDisplay?.icon || Icon.Circle;
  const iconColor = error ? errorDisplay?.color : color;

  // Get error message and recovery actions
  const finalDescription = error ? getErrorMessage(error, description) : description;
  const recoveryActions = error
    ? getRecoveryActions(error, {
        onRetry,
        onReconnect,
        onClearCache,
        onResetConfig,
      })
    : actions;

  return (
    <List>
      <List.EmptyView
        icon={{ source: iconSource, tintColor: iconColor }}
        title={title}
        description={finalDescription}
        actions={recoveryActions}
      />
    </List>
  );
};

/**
 * Predefined loading states for feedback display.
 */
export const LoadingStates = {
  DISCOVERING: {
    title: "Discovering Harmony Hubs...",
    description: "Searching your network for Harmony Hubs",
    icon: Icon.MagnifyingGlass,
  },
  CONNECTING: {
    title: "Connecting to Hub...",
    description: "Establishing connection to your Harmony Hub",
    icon: Icon.Link,
  },
  LOADING_ACTIVITIES: {
    title: "Loading Activities...",
    description: "Fetching available activities from your Hub",
    icon: Icon.List,
  },
  LOADING_DEVICES: {
    title: "Loading Devices...",
    description: "Fetching connected devices and their commands",
    icon: Icon.Devices,
  },
  EXECUTING_COMMAND: {
    title: "Executing Command...",
    description: "Sending command to your device",
    icon: Icon.Play,
  },
} as const;

/**
 * Predefined error states for feedback display.
 */
export const ErrorStates = {
  NO_HUBS_FOUND: {
    title: "No Harmony Hubs Found",
    description: "Make sure your Harmony Hub is:\n• Powered on\n• Connected to WiFi\n• On the same network",
    icon: Icon.WifiDisabled,
    color: Color.Red,
  },
  CONNECTION_FAILED: {
    title: "Connection Failed",
    description:
      "Unable to connect to your Harmony Hub. Try:\n• Checking your network connection\n• Restarting your Hub\n• Verifying Hub's IP address",
    icon: Icon.ExclamationMark,
    color: Color.Red,
  },
  COMMAND_FAILED: {
    title: "Command Failed",
    description:
      "Failed to execute the command. Try:\n• Checking device power\n• Verifying IR line of sight\n• Retrying the command",
    icon: Icon.ExclamationMark,
    color: Color.Red,
  },
  GENERAL_ERROR: {
    title: "Something Went Wrong",
    description: "An unexpected error occurred. Please try again or contact support if the issue persists.",
    icon: Icon.ExclamationMark,
    color: Color.Red,
  },
  NO_HUB_SELECTED: {
    title: "No Hub Selected",
    description: "Please select a Harmony Hub to continue",
    icon: Icon.ExclamationMark,
    color: Color.Red,
  },
} as const;

/**
 * Type for loading states
 */
export type LoadingState = keyof typeof LoadingStates;

/**
 * Type for error states
 */
export type ErrorState = keyof typeof ErrorStates;
