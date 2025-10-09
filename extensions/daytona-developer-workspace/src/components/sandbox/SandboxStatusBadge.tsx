/**
 * SandboxStatusBadge Utility
 * Helper function to generate status badge data for use in accessories
 */

import { Icon } from "@raycast/api";
import { formatSandboxStatus } from "../../lib/formatters/statusFormatter";
import { SandboxStatus } from "../../types/sandbox";

export interface StatusBadgeData {
  text?: string;
  icon: Icon;
  tooltip?: string;
}

export function getSandboxStatusBadge(
  status: SandboxStatus,
  showText = true,
  variant: "default" | "minimal" | "detailed" = "default",
): StatusBadgeData {
  const statusDisplay = formatSandboxStatus(status);

  if (variant === "minimal") {
    return {
      icon: statusDisplay.icon,
      tooltip: statusDisplay.tooltip,
    };
  }

  if (variant === "detailed") {
    return {
      text: statusDisplay.text,
      icon: statusDisplay.icon,
      tooltip: statusDisplay.tooltip || `Sandbox is ${statusDisplay.text.toLowerCase()}`,
    };
  }

  // Default variant
  return showText
    ? {
        text: statusDisplay.text,
        icon: statusDisplay.icon,
        tooltip: statusDisplay.tooltip,
      }
    : {
        icon: statusDisplay.icon,
        tooltip: statusDisplay.tooltip || statusDisplay.text,
      };
}
