/**
 * React component Props types.
 * @module
 */

import { Icon } from "@raycast/api";
import { HarmonyHub, HarmonyDevice, HarmonyActivity } from "./harmony";
import { HarmonyError } from "./errors";

/**
 * Props for components that display feedback states (loading, error, empty)
 * @interface FeedbackStateProps
 */
export interface FeedbackStateProps {
  /**
   * Title text to display
   */
  title: string;
  /**
   * Optional description or details
   */
  description?: string;
  /**
   * Icon to display with the feedback
   */
  icon?: Icon;
  /**
   * Optional color for styling
   */
  color?: string;
  /**
   * Optional actions that can be taken from this state
   */
  actions?: React.ReactNode;
}

/**
 * Props for HarmonyCommand component
 * @interface HarmonyCommandProps
 */
export interface HarmonyCommandProps {
  /**
   * Command title
   */
  title: string;
  /**
   * Command subtitle
   */
  subtitle?: string;
  /**
   * Command icon
   */
  icon?: Icon;
  /**
   * Action to execute when command is selected
   */
  onAction: () => void | Promise<void>;
  /**
   * Whether the command is currently loading
   */
  isLoading?: boolean;
  /**
   * Error state
   */
  error?: HarmonyError;
}

/**
 * Props for the DeviceList component
 * @interface DeviceListProps
 */
export interface DeviceListProps {
  /**
   * List of devices to display
   */
  devices: HarmonyDevice[];
  /**
   * Currently selected device
   */
  selectedDevice?: HarmonyDevice;
  /**
   * Action to execute when a device is selected
   */
  onDeviceSelect: (device: HarmonyDevice) => void;
  /**
   * Whether the list is currently loading
   */
  isLoading?: boolean;
  /**
   * Error state
   */
  error?: HarmonyError;
  /**
   * Optional filter for device types
   */
  deviceType?: string;
  /**
   * Optional filter for specific device IDs
   */
  deviceIds?: string[];
  /**
   * Optional custom render function for device items
   */
  renderItem?: (device: HarmonyDevice) => React.ReactNode;
}

/**
 * Props for the ActivityList component
 * @interface ActivityListProps
 */
export interface ActivityListProps {
  /**
   * List of activities to display
   */
  activities: HarmonyActivity[];
  /**
   * Currently active activity
   */
  currentActivity?: HarmonyActivity;
  /**
   * Action to execute when an activity is selected
   */
  onActivitySelect: (activity: HarmonyActivity) => void;
  /**
   * Whether the list is currently loading
   */
  isLoading?: boolean;
  /**
   * Error state
   */
  error?: HarmonyError;
  /**
   * Optional filter for activity types
   */
  activityType?: string;
  /**
   * Optional filter for specific activity IDs
   */
  activityIds?: string[];
  /**
   * Optional custom render function for activity items
   */
  renderItem?: (activity: HarmonyActivity) => React.ReactNode;
}

/**
 * Props for the HarmonyContext provider
 * @interface HarmonyContextProps
 */
export interface HarmonyContextProps {
  /**
   * Connected Harmony Hub instance
   */
  hub: HarmonyHub | null;
  /**
   * List of available devices
   */
  devices: HarmonyDevice[];
  /**
   * List of available activities
   */
  activities: HarmonyActivity[];
  /**
   * Currently running activity
   */
  currentActivity: HarmonyActivity | null;
  /**
   * Loading state indicator
   */
  isLoading: boolean;
  /**
   * Error state if any
   */
  error: Error | null;
  /**
   * Function to refresh hub connection
   */
  refresh: () => Promise<void>;
  /**
   * Function to execute device command
   */
  executeCommand: (deviceId: string, command: string) => Promise<void>;
  /**
   * Function to start activity
   */
  startActivity: (activityId: string) => Promise<void>;
}

/**
 * Props for the ErrorBoundary component
 * @interface ErrorBoundaryProps
 */
export interface ErrorBoundaryProps {
  /**
   * Child components to wrap with error boundary
   */
  children: React.ReactNode;
  /**
   * Optional custom error renderer
   */
  renderError?: (error: Error) => React.ReactNode;
  /**
   * Optional error handler callback
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Props for the ErrorDisplay component
 * @interface ErrorDisplayProps
 */
export interface ErrorDisplayProps {
  /**
   * Error to display
   */
  error: HarmonyError;
  /**
   * Action to execute when retry is clicked
   */
  onRetry?: () => void;
  /**
   * Action to execute when dismiss is clicked
   */
  onDismiss?: () => void;
}

/**
 * Props for the HubSelector component
 * @interface HubSelectorProps
 */
export interface HubSelectorProps {
  /** List of available Harmony Hubs */
  hubs: HarmonyHub[];
  /** Currently selected hub */
  selectedHub: HarmonyHub | null;
  /** Callback when a hub is selected */
  onHubSelect: (hub: HarmonyHub) => void;
  /** Whether the component is in a loading state */
  isLoading?: boolean;
  /** Error state if any */
  error?: HarmonyError;
}

/**
 * Props for the LoadingIndicator component
 * @interface LoadingIndicatorProps
 */
export interface LoadingIndicatorProps {
  /**
   * Loading message to display
   */
  message?: string;
  /**
   * Progress percentage (0-100)
   */
  progress?: number;
}
