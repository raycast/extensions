/**
 * Status formatting utilities
 * Consistent status display and badge formatting
 */

import { Icon, Color } from "@raycast/api";
import { SandboxStatus } from "../../types/sandbox";
import { ICONS } from "../constants/ui";

export interface StatusDisplay {
  text: string;
  icon: Icon;
  color: Color;
  tooltip?: string;
}

/**
 * Format sandbox status for display
 */
export function formatSandboxStatus(status: SandboxStatus): StatusDisplay {
  switch (status) {
    case "running":
      return {
        text: "Running",
        icon: ICONS.SANDBOX.RUNNING,
        color: Color.Green,
        tooltip: "Sandbox is active and ready for use",
      };
    case "stopped":
      return {
        text: "Stopped",
        icon: ICONS.SANDBOX.STOPPED,
        color: Color.SecondaryText,
        tooltip: "Sandbox is stopped",
      };
    case "creating":
      return {
        text: "Creating",
        icon: ICONS.SANDBOX.CREATING,
        color: Color.Orange,
        tooltip: "Sandbox is being created",
      };
    case "deleting":
      return {
        text: "Deleting",
        icon: ICONS.SANDBOX.DELETING,
        color: Color.Red,
        tooltip: "Sandbox is being deleted",
      };
    case "starting":
      return {
        text: "Starting",
        icon: ICONS.SANDBOX.STARTING,
        color: Color.Orange,
        tooltip: "Sandbox is starting up",
      };
    case "stopping":
      return {
        text: "Stopping",
        icon: ICONS.SANDBOX.STOPPING,
        color: Color.Orange,
        tooltip: "Sandbox is shutting down",
      };
    default:
      return {
        text: "Unknown",
        icon: Icon.QuestionMark,
        color: Color.SecondaryText,
        tooltip: "Status unknown",
      };
  }
}

/**
 * Format execution status for display
 */
export function formatExecutionStatus(success: boolean, exitCode?: number): StatusDisplay {
  if (success) {
    return {
      text: "Success",
      icon: ICONS.EXECUTION.SUCCESS,
      color: Color.Green,
      tooltip: "Execution completed successfully",
    };
  }

  const tooltip = exitCode !== undefined ? `Execution failed with exit code ${exitCode}` : "Execution failed";

  return {
    text: "Failed",
    icon: ICONS.EXECUTION.ERROR,
    color: Color.Red,
    tooltip,
  };
}

/**
 * Format git file status for display
 */
export function formatGitFileStatus(status: string): StatusDisplay {
  const normalizedStatus = status.toLowerCase().trim();

  switch (normalizedStatus) {
    case "modified":
    case "m":
      return {
        text: "Modified",
        icon: Icon.Pencil,
        color: Color.Orange,
        tooltip: "File has been modified",
      };
    case "added":
    case "a":
      return {
        text: "Added",
        icon: Icon.Plus,
        color: Color.Green,
        tooltip: "File has been added",
      };
    case "deleted":
    case "d":
      return {
        text: "Deleted",
        icon: Icon.Trash,
        color: Color.Red,
        tooltip: "File has been deleted",
      };
    case "renamed":
    case "r":
      return {
        text: "Renamed",
        icon: Icon.ArrowRight,
        color: Color.Blue,
        tooltip: "File has been renamed",
      };
    case "untracked":
    case "??":
      return {
        text: "Untracked",
        icon: Icon.QuestionMark,
        color: Color.SecondaryText,
        tooltip: "File is not tracked by git",
      };
    default:
      return {
        text: status,
        icon: Icon.Document,
        color: Color.SecondaryText,
        tooltip: `Git status: ${status}`,
      };
  }
}

/**
 * Format boolean status as Yes/No with appropriate styling
 */
export function formatBooleanStatus(value: boolean, trueLabel = "Yes", falseLabel = "No"): StatusDisplay {
  return {
    text: value ? trueLabel : falseLabel,
    icon: value ? Icon.Check : Icon.Multiply,
    color: value ? Color.Green : Color.Red,
    tooltip: undefined,
  };
}

/**
 * Format connection status
 */
export function formatConnectionStatus(connected: boolean): StatusDisplay {
  return {
    text: connected ? "Connected" : "Disconnected",
    icon: connected ? Icon.Wifi : Icon.WifiDisabled,
    color: connected ? Color.Green : Color.Red,
    tooltip: connected ? "Successfully connected to Daytona" : "Not connected to Daytona",
  };
}

/**
 * Get status priority for sorting (higher number = higher priority)
 */
export function getStatusPriority(status: SandboxStatus): number {
  switch (status) {
    case "creating":
      return 100;
    case "starting":
      return 90;
    case "stopping":
      return 80;
    case "deleting":
      return 70;
    case "running":
      return 60;
    case "stopped":
      return 10;
    default:
      return 0;
  }
}

/**
 * Check if status indicates the sandbox is in a transitional state
 */
export function isTransitionalStatus(status: SandboxStatus): boolean {
  return ["creating", "starting", "stopping", "deleting"].includes(status);
}

/**
 * Check if status indicates the sandbox is operational
 */
export function isOperationalStatus(status: SandboxStatus): boolean {
  return status === "running";
}

/**
 * Format progress status with percentage
 */
export function formatProgressStatus(current: number, total: number): StatusDisplay {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return {
    text: `${percentage}%`,
    icon: Icon.BarChart,
    color: percentage === 100 ? Color.Green : Color.Orange,
    tooltip: `Progress: ${current}/${total} (${percentage}%)`,
  };
}
